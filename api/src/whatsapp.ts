import { Types } from "mongoose";
import { config, whatsappConfigured } from "./config.js";
import { Order } from "./models/Order.js";

const notificationTimeoutMs = 15_000;
const staleAttemptMs = 2 * 60 * 1000;

function formatOrderItems(order: {
  items: Array<{ name: string; packageSize?: number | null; packageUnit?: string | null; quantity: number; unitPrice: number }>;
}) {
  const details = order.items.map((item) => {
    const packageSize = item.packageSize && item.packageUnit ? ` (${item.packageSize} ${item.packageUnit})` : "";
    return `${item.name}${packageSize} x ${item.quantity} - ₹${(item.unitPrice * item.quantity).toLocaleString("en-IN")}`;
  }).join("; ");
  return details.length > 1000 ? `${details.slice(0, 997)}...` : details;
}

export async function sendOrderConfirmationWhatsApp(orderId: string | Types.ObjectId) {
  const existingOrder = await Order.findById(orderId).select("paymentStatus customer.whatsappOptIn whatsappConfirmationStatus");
  if (!existingOrder || existingOrder.paymentStatus !== "paid") return;
  if (!existingOrder.customer.whatsappOptIn) {
    await Order.updateOne(
      { _id: orderId, whatsappConfirmationStatus: "pending" },
      { $set: { whatsappConfirmationStatus: "not_opted_in" } },
    );
    return;
  }

  if (!whatsappConfigured) {
    const result = await Order.updateOne(
      { _id: orderId, paymentStatus: "paid", whatsappConfirmationStatus: "pending" },
      { $set: { whatsappConfirmationStatus: "not_configured" } },
    );
    if (result.modifiedCount > 0) {
      console.warn("WhatsApp order confirmation was not sent; configure the WhatsApp Cloud API settings.");
    }
    return;
  }

  const attemptedBefore = new Date(Date.now() - staleAttemptMs);
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: "paid",
      $or: [
        { whatsappConfirmationStatus: { $in: ["pending", "failed", "not_configured"] } },
        { whatsappConfirmationStatus: "sending", whatsappConfirmationAttemptedAt: { $lt: attemptedBefore } },
      ],
    },
    {
      $set: {
        whatsappConfirmationStatus: "sending",
        whatsappConfirmationAttemptedAt: new Date(),
      },
    },
    { new: true },
  );
  if (!order) return;

  const items = formatOrderItems(order);
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: order.currency,
    maximumFractionDigits: 2,
  }).format(order.amount);
  const endpoint = `https://graph.facebook.com/${config.WHATSAPP_GRAPH_API_VERSION}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(notificationTimeoutMs),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: `${config.WHATSAPP_COUNTRY_CODE}${order.customer.whatsappPhone}`,
        type: "template",
        template: {
          name: config.WHATSAPP_TEMPLATE_NAME,
          language: { code: config.WHATSAPP_TEMPLATE_LANGUAGE },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: order.customer.name },
              { type: "text", text: order.orderNumber ?? order.id },
              { type: "text", text: items },
              { type: "text", text: amount },
            ],
          }],
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`WhatsApp Cloud API returned HTTP ${response.status}.`);
    }
    await Order.updateOne(
      { _id: order._id, whatsappConfirmationStatus: "sending" },
      { $set: { whatsappConfirmationStatus: "sent" }, $unset: { whatsappConfirmationAttemptedAt: 1 } },
    );
  } catch (error) {
    await Order.updateOne(
      { _id: order._id, whatsappConfirmationStatus: "sending" },
      { $set: { whatsappConfirmationStatus: "failed" }, $unset: { whatsappConfirmationAttemptedAt: 1 } },
    );
    console.error(
      `WhatsApp order confirmation failed for ${order.orderNumber ?? order.id}:`,
      error instanceof Error ? error.message : "Unknown delivery error.",
    );
  }
}
