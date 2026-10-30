import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Types } from "mongoose";
import { z } from "zod";
import { config } from "../config.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { getDeliveryCharge } from "../models/StoreSettings.js";
import { razorpay } from "../payments.js";
import { optionalUser } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/HttpError.js";
import { enforceSameOrigin } from "../middleware/security.js";
import { sendOrderConfirmationWhatsApp } from "../whatsapp.js";
import { INDIAN_STATES } from "../data/indiaStates.js";
import { OrderNumberCounter } from "../models/OrderNumberCounter.js";

const router = Router();

async function createOrderNumber() {
  const counter = await OrderNumberCounter.findOneAndUpdate(
    { _id: "orders" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true },
  );
  const suffix = String(999 + counter.sequence).padStart(4, "0");
  return `SM-${String(new Date().getFullYear()).slice(-2)}-${suffix}`;
}

function isOrderNumberCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) return false;
  return "keyPattern" in error &&
    typeof error.keyPattern === "object" &&
    error.keyPattern !== null &&
    "orderNumber" in error.keyPattern;
}

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const orderLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().refine(Types.ObjectId.isValid),
    variantId: z.string().refine(Types.ObjectId.isValid).optional(),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().regex(/^\d{10}$/, "Phone number must contain exactly 10 digits."),
    whatsappPhone: z.string().trim().regex(/^\d{10}$/, "WhatsApp number must contain exactly 10 digits."),
    whatsappOptIn: z.boolean().default(false),
    address: z.string().trim().min(4).max(300),
    city: z.string().trim().min(2).max(100),
    state: z.enum(INDIAN_STATES),
    postalCode: z.string().trim().min(3).max(20),
    country: z.literal("India"),
  }),
});
const verifySchema = z.object({
  orderId: z.string().refine(Types.ObjectId.isValid),
  razorpay_order_id: z.string().min(1).max(80),
  razorpay_payment_id: z.string().min(1).max(80),
  razorpay_signature: z.string().min(1).max(256),
});

function isValidSignature(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function applyCapturedPayment(orderId: string, paymentId: string, paymentOrderId: string, amount: number, currency: string) {
  const order = await Order.findById(orderId);
  if (!order || order.razorpayOrderId !== paymentOrderId || order.amount * 100 !== amount || currency !== "INR") {
    throw new HttpError("Payment details do not match this order.", 400);
  }
  if (order.paymentStatus === "paid" && order.razorpayPaymentId === paymentId) {
    await sendOrderConfirmationWhatsApp(order._id);
    return order;
  }
  if (
    order.razorpayPaymentId === paymentId &&
    (order.paymentStatus === "refund_pending" || order.paymentStatus === "refunded")
  ) {
    return order;
  }
  if (order.paymentStatus !== "created" || order.status !== "pending") {
    const refund = await razorpay.payments.refund(paymentId, {
      amount,
      notes: { reason: "Order is no longer available for payment." },
    });
    if (order.paymentStatus !== "paid") {
      const processed = refund.status === "processed";
      const failed = refund.status === "failed";
      order.paymentStatus = processed ? "refunded" : failed ? "refund_failed" : "refund_pending";
      order.status = processed ? "refunded" : failed ? "refund_failed" : "refund_pending";
      order.razorpayPaymentId = paymentId;
      await order.save();
    }
    throw new HttpError(
      refund.status === "processed"
        ? "This order was no longer active. The payment has been refunded."
        : "This order was no longer active. A payment refund has been initiated.",
      409,
    );
  }

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: "created", status: "pending" },
    { $set: { paymentStatus: "paid", status: "paid", razorpayPaymentId: paymentId, paidAt: new Date() } },
    { new: true },
  );
  if (!claimed) {
    const current = await Order.findById(order._id);
    if (current?.paymentStatus === "paid" && current.razorpayPaymentId === paymentId) return current;
    throw new HttpError("Order payment is already being processed.", 409);
  }

  const reserved: Array<{ productId: Types.ObjectId; variantId?: Types.ObjectId; quantity: number }> = [];
  for (const item of order.items) {
    const filter = item.variant
      ? { _id: item.product, active: true, variants: { $elemMatch: { _id: item.variant, stock: { $gte: item.quantity } } } }
      : { _id: item.product, stock: { $gte: item.quantity }, active: true };
    const update = item.variant
      ? { $inc: { "variants.$.stock": -item.quantity, stock: -item.quantity } }
      : { $inc: { stock: -item.quantity } };
    const result = await Product.updateOne(filter, update);
    if (result.modifiedCount !== 1) {
      for (const reservation of reserved) {
        if (reservation.variantId) {
          await Product.updateOne(
            { _id: reservation.productId, "variants._id": reservation.variantId },
            { $inc: { "variants.$.stock": reservation.quantity, stock: reservation.quantity } },
          );
        } else {
          await Product.updateOne({ _id: reservation.productId }, { $inc: { stock: reservation.quantity } });
        }
      }
      const refund = await razorpay.payments.refund(paymentId, {
        amount,
        notes: { reason: "One or more products are no longer in stock." },
      });
      const processed = refund.status === "processed";
      const failed = refund.status === "failed";
      claimed.paymentStatus = processed ? "refunded" : failed ? "refund_failed" : "refund_pending";
      claimed.status = processed ? "refunded" : failed ? "refund_failed" : "refund_pending";
      await claimed.save();
      if (!refund.id) {
        throw new HttpError("Stock was unavailable and the payment refund could not be confirmed.", 502);
      }
      throw new HttpError(
        processed
          ? "A product is no longer in stock. The payment has been refunded."
          : "A product is no longer in stock. A payment refund has been initiated.",
        409,
      );
    }
    reserved.push({ productId: item.product, variantId: item.variant ?? undefined, quantity: item.quantity });
  }
  await sendOrderConfirmationWhatsApp(claimed._id);
  return claimed;
}

router.post(
  "/",
  enforceSameOrigin,
  checkoutLimiter,
  optionalUser,
  asyncHandler(async (req, res) => {
    const input = checkoutSchema.parse(req.body);
    const quantities = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of input.items) {
      const key = `${item.productId}:${item.variantId ?? "default"}`;
      const current = quantities.get(key);
      quantities.set(key, { ...item, quantity: (current?.quantity ?? 0) + item.quantity });
    }
    const products = await Product.find({
      _id: { $in: [...new Set([...quantities.values()].map(({ productId }) => productId))] },
      active: true,
    }).populate("category", "name slug");
    if (products.length !== new Set([...quantities.values()].map(({ productId }) => productId)).size) {
      res.status(400).json({ error: "One or more selected products are unavailable." });
      return;
    }

    const orderItems = [...quantities.values()].map(({ productId, variantId, quantity }) => {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) throw new HttpError("One or more selected products are unavailable.", 400);
      const productVariants = product.variants ?? [];
      const variant = variantId ? productVariants.find((candidate) => candidate.id === variantId) : undefined;
      if (variantId && !variant) {
        throw new HttpError(`The selected package size for ${product.name} is no longer available.`, 409);
      }
      if (productVariants.length && !variant) {
        throw new HttpError(`Choose a valid package size for ${product.name}.`, 400);
      }
      const availableStock = variant?.stock ?? product.stock;
      if (availableStock < quantity) throw new HttpError(`${product.name} does not have enough stock for the selected size.`, 409);
      return {
        product: product._id,
        variant: variant?._id ?? null,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] ?? product.image,
        packageSize: variant?.size ?? product.packageSize,
        packageUnit: variant?.unit ?? product.packageUnit,
        unitPrice: variant?.price ?? product.price,
        quantity,
      };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryCharge = await getDeliveryCharge(input.customer.state);
    const amount = subtotal + deliveryCharge;
    if (!Number.isSafeInteger(amount) || subtotal < 1 || amount > 10000000) {
      res.status(400).json({ error: "The order amount is invalid." });
      return;
    }

    const receipt = randomUUID().replace(/-/g, "").slice(0, 32);
    const gatewayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt,
    });
    let order;
    for (let attempt = 0; ; attempt += 1) {
      try {
        order = await Order.create({
          orderNumber: await createOrderNumber(),
          user: req.user?.id ?? null,
          items: orderItems,
          customer: { ...input.customer, email: input.customer.email.toLowerCase() },
          subtotal,
          deliveryCharge,
          amount,
          razorpayOrderId: gatewayOrder.id,
        });
        break;
      } catch (error) {
        if (!isOrderNumberCollision(error) || attempt >= 100) throw error;
      }
    }
    res.status(201).json({
      orderId: order.id,
      amount: gatewayOrder.amount,
      subtotal,
      deliveryCharge,
      total: amount,
      currency: gatewayOrder.currency,
      razorpayOrderId: gatewayOrder.id,
      keyId: config.RAZORPAY_KEY_ID,
    });
  }),
);

router.post(
  "/verify-payment",
  enforceSameOrigin,
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const input = verifySchema.parse(req.body);
    const order = await Order.findById(input.orderId);
    if (!order || order.razorpayOrderId !== input.razorpay_order_id) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    const expected = createHmac("sha256", config.RAZORPAY_KEY_SECRET)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");
    if (!isValidSignature(expected, input.razorpay_signature)) {
      res.status(400).json({ error: "Payment signature is invalid." });
      return;
    }

    const payment = await razorpay.payments.fetch(input.razorpay_payment_id);
    if (payment.order_id !== input.razorpay_order_id || payment.amount !== order.amount * 100 || payment.currency !== "INR") {
      res.status(400).json({ error: "Payment details do not match this order." });
      return;
    }
    let capturedPayment = payment;
    if (payment.status === "authorized") {
      capturedPayment = await razorpay.payments.capture(input.razorpay_payment_id, order.amount * 100, "INR");
    }
    if (capturedPayment.status !== "captured") {
      res.status(409).json({ error: "Payment has not been captured. Please check with your bank or retry." });
      return;
    }
    const capturedAmount = Number(capturedPayment.amount);
    if (!Number.isSafeInteger(capturedAmount)) {
      res.status(400).json({ error: "Payment amount is invalid." });
      return;
    }

    const updated = await applyCapturedPayment(
      order.id,
      input.razorpay_payment_id,
      input.razorpay_order_id,
      capturedAmount,
      capturedPayment.currency,
    );
    res.json({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });
  }),
);

router.get(
  "/track/phone",
  orderLookupLimiter,
  asyncHandler(async (req, res) => {
    const input = z.object({
      phone: z.string().min(7).max(24),
    }).parse(req.query);
    const orders = await Order.find({
      "customer.phone": input.phone,
      status: { $nin: ["pending", "delivered", "cancelled", "refunded", "refund_failed"] },
    })
      .select("orderNumber status paymentStatus amount currency createdAt trackingUrl trackingNumber dispatchedAt items.name items.quantity items.packageSize items.packageUnit")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ orders: orders.map((order) => ({
      ...order,
      trackingUrl: ["shipped", "delivered"].includes(order.status) ? order.trackingUrl : undefined,
      trackingNumber: ["shipped", "delivered"].includes(order.status) ? order.trackingNumber : undefined,
    })) });
  }),
);

router.get(
  "/track",
  orderLookupLimiter,
  asyncHandler(async (req, res) => {
    const input = z.object({
      orderNumber: z.string().trim().regex(/^SM-\d{2}-(?:[A-Z0-9]{4}|\d{5,})$/i),
      email: z.string().trim().email().max(254),
    }).parse(req.query);
    const order = await Order.findOne({
      orderNumber: input.orderNumber.toUpperCase(),
      "customer.email": input.email.toLowerCase(),
    }).select("orderNumber status paymentStatus amount currency createdAt trackingUrl trackingNumber dispatchedAt");
    if (!order) {
      res.status(404).json({ error: "No order matches that order number and email address." });
      return;
    }
    res.json({ order: ["shipped", "delivered"].includes(order.status)
      ? order
      : { ...order.toObject(), trackingUrl: undefined, trackingNumber: undefined } });
  }),
);

router.get(
  "/:id/status",
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id) || typeof req.query.email !== "string") {
      res.status(400).json({ error: "Order id and email are required." });
      return;
    }
    const order = await Order.findOne({
      _id: req.params.id,
      "customer.email": req.query.email.toLowerCase(),
    }).select("orderNumber status paymentStatus amount currency createdAt trackingUrl trackingNumber dispatchedAt");
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json({ order: ["shipped", "delivered"].includes(order.status)
      ? order
      : { ...order.toObject(), trackingUrl: undefined, trackingNumber: undefined } });
  }),
);

export async function handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!signature) throw new HttpError("Webhook signature is missing.", 400);
  const expected = createHmac("sha256", config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!isValidSignature(expected, signature)) {
    throw new HttpError("Webhook signature is invalid.", 400);
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } };
      refund?: { entity?: { payment_id?: string; status?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new HttpError("Webhook body is not valid JSON.", 400);
  }
  if (event.event === "refund.processed") {
    const refund = event.payload?.refund?.entity;
    if (refund?.payment_id) {
      await Order.updateOne(
        { razorpayPaymentId: refund.payment_id, paymentStatus: "refund_pending" },
        { $set: { paymentStatus: "refunded", status: "refunded" } },
      );
    }
    return;
  }
  if (event.event === "refund.failed") {
    const refund = event.payload?.refund?.entity;
    if (refund?.payment_id) {
      await Order.updateOne(
        { razorpayPaymentId: refund.payment_id, paymentStatus: "refund_pending" },
        { $set: { paymentStatus: "refund_failed", status: "refund_failed" } },
      );
    }
    return;
  }
  if (event.event !== "payment.captured") return;
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || !payment.amount || !payment.currency || payment.status !== "captured") {
    throw new HttpError("Webhook payment payload is incomplete.", 400);
  }
  const order = await Order.findOne({ razorpayOrderId: payment.order_id }).select("_id");
  if (!order) {
    console.error("Razorpay reported a captured payment for an unknown order:", payment.order_id);
    return;
  }
  await applyCapturedPayment(order.id, payment.id, payment.order_id, payment.amount, payment.currency);
}

export default router;
