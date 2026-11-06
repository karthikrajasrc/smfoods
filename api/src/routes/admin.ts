import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Types } from "mongoose";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { cloudinary } from "../cloudinary.js";
import { cloudinaryConfigured, cloudinaryImageBasePath } from "../config.js";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { DEFAULT_BRAND_CONTACT, getStateDeliveryCharges, StoreSettings } from "../models/StoreSettings.js";
import { razorpay } from "../payments.js";
import { requireAdmin, requireUser } from "../middleware/auth.js";
import { enforceSameOrigin } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slug.js";
import { HttpError } from "../utils/HttpError.js";
import { sendOrderConfirmationWhatsApp } from "../whatsapp.js";
import { INDIAN_STATES } from "../data/indiaStates.js";

const router = Router();
router.use(requireUser, requireAdmin, enforceSameOrigin);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 0 },
});
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const deliveryChargeSchema = z.object({
  deliveryCharges: z.array(z.object({
    state: z.enum(INDIAN_STATES),
    amount: z.number().int().min(0).max(1000000),
    enabled: z.boolean(),
  })).length(INDIAN_STATES.length),
}).superRefine(({ deliveryCharges }, context) => {
  const states = new Set(deliveryCharges.map(({ state }) => state));
  if (states.size !== INDIAN_STATES.length || INDIAN_STATES.some((state) => !states.has(state))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryCharges"], message: "Provide exactly one delivery charge for every Indian state and union territory." });
  }
});
const heroImagesSchema = z.object({
  heroImages: z.array(
    z.string().url().max(2048).refine(isCloudinaryImageUrl, "Upload banner images to Cloudinary before saving."),
  ).max(3),
  heroMobileImages: z.array(
    z.string().max(2048).refine((value) => value === "" || isCloudinaryImageUrl(value), "Upload mobile banner images to Cloudinary before saving."),
  ).max(3),
}).superRefine((data, context) => {
  if (data.heroMobileImages.length > data.heroImages.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["heroMobileImages"], message: "Mobile images must match an existing desktop banner." });
  }
});
const brandContactSchema = z.object({
  phone: z.string().trim().min(1).max(24).refine(
    (phone) => /^\+91[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, "")),
    "Enter an Indian mobile number with the +91 country code and 10 digits.",
  ),
  email: z.string().trim().email().max(254),
  address: z.string().trim().min(5).max(300),
});

router.get(
  "/brand-contact",
  asyncHandler(async (_req, res) => {
    const settings = await StoreSettings.findById("storefront").select("brandPhone brandEmail brandAddress").lean();
    res.json({
      phone: settings?.brandPhone ?? DEFAULT_BRAND_CONTACT.phone,
      email: settings?.brandEmail ?? DEFAULT_BRAND_CONTACT.email,
      address: settings?.brandAddress ?? DEFAULT_BRAND_CONTACT.address,
    });
  }),
);

router.patch(
  "/brand-contact",
  validateBody(brandContactSchema),
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findByIdAndUpdate(
      "storefront",
      {
        $set: {
          brandPhone: req.body.phone,
          brandEmail: req.body.email,
          brandAddress: req.body.address,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({
      phone: settings.brandPhone,
      email: settings.brandEmail,
      address: settings.brandAddress,
    });
  }),
);

router.get(
  "/delivery-charge",
  asyncHandler(async (_req, res) => {
    res.json({ deliveryCharges: await getStateDeliveryCharges() });
  }),
);

router.patch(
  "/delivery-charge",
  validateBody(deliveryChargeSchema),
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findByIdAndUpdate(
      "storefront",
      {
        $set: {
          deliveryCharges: req.body.deliveryCharges,
          deliveryCharge: 0,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({ deliveryCharges: settings.deliveryCharges });
  }),
);

router.get(
  "/home-banner",
  asyncHandler(async (_req, res) => {
    const settings = await StoreSettings.findById("storefront").select("heroImages heroMobileImages").lean();
    res.json({
      heroImages: settings?.heroImages ?? [],
      heroMobileImages: settings?.heroMobileImages ?? [],
    });
  }),
);

router.patch(
  "/home-banner",
  validateBody(heroImagesSchema),
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findByIdAndUpdate(
      "storefront",
      { $set: { heroImages: req.body.heroImages, heroMobileImages: req.body.heroMobileImages } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({ heroImages: settings.heroImages, heroMobileImages: settings.heroMobileImages });
  }),
);

function isCloudinaryImageUrl(value: string) {
  try {
    const url = new URL(value);
    return cloudinaryConfigured &&
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(cloudinaryImageBasePath);
  } catch {
    return false;
  }
}

function uploadToCloudinary(
  buffer: Buffer,
  folder = "smfoods/products",
  dimensions = { width: 1600, height: 1600 },
): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: randomUUID(),
        resource_type: "image",
        format: "webp",
        transformation: [{ ...dimensions, crop: "limit", quality: "auto" }],
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary returned no uploaded image URL."));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  iconImage: z.string().url().max(2048).refine(isCloudinaryImageUrl, "Upload the category icon to Cloudinary before saving.").optional(),
});
const productFields = {
  name: z.string().trim().min(2).max(160),
  description: z.string().max(5000).default(""),
  categoryId: z.string().refine(Types.ObjectId.isValid, "Invalid category."),
  price: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().optional(),
  packageSize: z.number().positive().max(10000).optional(),
  packageUnit: z.enum(["kg", "g", "L", "ml"]).optional(),
  image: z.string().url().max(2048).refine(isCloudinaryImageUrl, "Upload the product image to Cloudinary before saving."),
  images: z.array(z.string().url().max(2048).refine(isCloudinaryImageUrl, "Upload product images to Cloudinary before saving.")).min(1).max(5),
  variants: z.array(z.object({
    _id: z.string().refine(Types.ObjectId.isValid).optional(),
    size: z.number().positive().max(10000),
    unit: z.enum(["kg", "g", "L", "ml"]),
    price: z.number().int().positive(),
    compareAtPrice: z.number().int().positive().optional(),
    stock: z.number().int().min(0).max(100000),
  }).strict()).min(1).max(20),
  stock: z.number().int().min(0).max(100000),
  featured: z.boolean().default(false),
  showInCombos: z.boolean().default(false),
  active: z.boolean().default(true),
};
function validateVariants(data: { variants?: Array<{ size: number; unit: string }> }, context: z.RefinementCtx) {
  if (!data.variants) return;
  const seen = new Set<string>();
  data.variants.forEach((variant, index) => {
    const key = `${variant.size}:${variant.unit}`;
    if (seen.has(key)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, "size"], message: "Each package size must be unique." });
    seen.add(key);
  });
}
const productSchema = z.object(productFields).superRefine(validateVariants);
const updateProductSchema = z.object(productFields).partial().superRefine(validateVariants);
const orderStatusSchema = z.object({
  status: z.enum(["shipped", "delivered", "cancelled", "refunded"]),
  trackingUrl: z.string().trim().url().max(2048).refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a secure HTTPS tracking link.").optional(),
  trackingNumber: z.string().trim().min(2).max(120).optional(),
}).superRefine((data, context) => {
  if (data.status === "shipped" && (!data.trackingUrl || !data.trackingNumber)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter both a secure tracking link and tracking ID before dispatching.",
    });
  }
});
const orderListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  name: z.string().trim().max(120).default(""),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((query, context) => {
  for (const key of ["from", "to"] as const) {
    const value = query[key];
    if (value) {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Invalid ${key} date.` });
      }
    }
  }
  if (query.from && query.to && query.from > query.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "End date must be on or after start date." });
  }
});

router.post(
  "/uploads/product-image",
  imageUpload.array("images", 5),
  asyncHandler(async (req, res) => {
    if (!cloudinaryConfigured) {
      res.status(503).json({
        error: "Image uploads are not configured. Set the Cloudinary credentials in api/.env and restart the API.",
      });
      return;
    }
    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "Choose at least one product image." });
      return;
    }
    for (const file of files) {
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !acceptedImageTypes.has(detectedType.mime)) {
        res.status(400).json({ error: "Upload valid JPEG, PNG, or WebP images." });
        return;
      }
    }
    let uploaded: Array<{ secureUrl: string; publicId: string }>;
    try {
      uploaded = await Promise.all(files.map((file) => uploadToCloudinary(file.buffer)));
    } catch (error) {
      console.error("Cloudinary product image upload failed:", error);
      throw new HttpError("Cloudinary could not store the image. Verify its credentials and try again.", 502);
    }
    res.status(201).json({ images: uploaded.map(({ secureUrl, publicId }) => ({ url: secureUrl, publicId })) });
  }),
);

router.post(
  "/uploads/banner-image",
  imageUpload.array("images", 3),
  asyncHandler(async (req, res) => {
    if (!cloudinaryConfigured) {
      res.status(503).json({
        error: "Image uploads are not configured. Set the Cloudinary credentials in api/.env and restart the API.",
      });
      return;
    }
    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "Choose at least one banner image." });
      return;
    }
    for (const file of files) {
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !acceptedImageTypes.has(detectedType.mime)) {
        res.status(400).json({ error: "Upload valid JPEG, PNG, or WebP images." });
        return;
      }
    }
    let uploaded: Array<{ secureUrl: string; publicId: string }>;
    try {
      uploaded = await Promise.all(files.map((file) => uploadToCloudinary(file.buffer, "smfoods/banners", { width: 2400, height: 1200 })));
    } catch (error) {
      console.error("Cloudinary banner image upload failed:", error);
      throw new HttpError("Cloudinary could not store the image. Verify its credentials and try again.", 502);
    }
    res.status(201).json({ images: uploaded.map(({ secureUrl, publicId }) => ({ url: secureUrl, publicId })) });
  }),
);

router.post(
  "/uploads/category-icon",
  imageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!cloudinaryConfigured) {
      res.status(503).json({
        error: "Image uploads are not configured. Set the Cloudinary credentials in api/.env and restart the API.",
      });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Choose a category icon image." });
      return;
    }
    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || !acceptedImageTypes.has(detectedType.mime)) {
      res.status(400).json({ error: "Upload a valid JPEG, PNG, or WebP image." });
      return;
    }
    let uploaded: { secureUrl: string; publicId: string };
    try {
      uploaded = await uploadToCloudinary(file.buffer, "smfoods/categories", { width: 400, height: 400 });
    } catch (error) {
      console.error("Cloudinary category icon upload failed:", error);
      throw new HttpError("Cloudinary could not store the image. Verify its credentials and try again.", 502);
    }
    res.status(201).json({ url: uploaded.secureUrl, publicId: uploaded.publicId });
  }),
);

router.get("/uploads/status", (_req, res) => {
  res.json({ configured: cloudinaryConfigured });
});

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({ categories });
  }),
);

router.post(
  "/categories",
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const slug = slugify(req.body.name);
    if (!slug) {
      res.status(400).json({ error: "Category name must contain letters or numbers." });
      return;
    }
    const category = await Category.create({ name: req.body.name, slug, iconImage: req.body.iconImage });
    res.status(201).json({ category });
  }),
);

router.patch(
  "/categories/:id",
  validateBody(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid category id." });
      return;
    }
    const updates: Record<string, string> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.iconImage !== undefined) updates.iconImage = req.body.iconImage;
    if (req.body.name !== undefined) {
      const slug = slugify(req.body.name);
      if (!slug) {
        res.status(400).json({ error: "Category name must contain letters or numbers." });
        return;
      }
      updates.slug = slug;
    }
    const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!category) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    res.json({ category });
  }),
);

router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid category id." });
      return;
    }
    const categoryId = new Types.ObjectId(req.params.id);
    if (await Product.exists({ category: categoryId })) {
      res.status(409).json({ error: "Move or remove products from this category before deleting it." });
      return;
    }
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    res.status(204).end();
  }),
);

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await Product.find().populate("category", "name slug").sort({ createdAt: -1 }).lean();
    res.json({ products });
  }),
);

router.post(
  "/products",
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    if (!(await Category.exists({ _id: req.body.categoryId }))) {
      res.status(400).json({ error: "Select a valid product category." });
      return;
    }
    const slug = slugify(req.body.name);
    if (!slug) {
      res.status(400).json({ error: "Product name must contain letters or numbers." });
      return;
    }
    const product = await Product.create({ ...req.body, slug, category: req.body.categoryId });
    res.status(201).json({ product });
  }),
);

router.patch(
  "/products/:id",
  validateBody(updateProductSchema),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }
    if (req.body.categoryId && !(await Category.exists({ _id: req.body.categoryId }))) {
      res.status(400).json({ error: "Select a valid product category." });
      return;
    }
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const updates: Record<string, unknown> = { ...req.body };
    if (req.body.categoryId) {
      updates.category = req.body.categoryId;
      delete updates.categoryId;
    }
    if (req.body.name !== undefined) {
      const slug = slugify(req.body.name);
      if (!slug) {
        res.status(400).json({ error: "Product name must contain letters or numbers." });
        return;
      }
      updates.slug = slug;
    }
    const willBeFeatured = req.body.featured ?? currentProduct.featured;
    const willBeActive = req.body.active ?? currentProduct.active;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug");
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    res.json({ product });
  }),
);

router.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    res.status(204).end();
  }),
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const query = orderListSchema.parse(req.query);
    const limit = 10;
    const filter: Record<string, unknown> = {};
    if (query.name) {
      const escapedName = query.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["customer.name"] = { $regex: escapedName, $options: "i" };
    }
    if (query.from || query.to) {
      const createdAt: { $gte?: Date; $lt?: Date } = {};
      if (query.from) createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) {
        const end = new Date(`${query.to}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + 1);
        createdAt.$lt = end;
      }
      filter.createdAt = createdAt;
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, page: query.page, limit, pages: Math.ceil(total / limit), total });
  }),
);

router.post(
  "/orders/:id/whatsapp-confirmation",
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid order id." });
      return;
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.paymentStatus !== "paid") {
      res.status(409).json({ error: "Only paid orders can receive a WhatsApp confirmation." });
      return;
    }
    if (!order.customer.whatsappOptIn) {
      res.status(409).json({ error: "The customer did not opt in to WhatsApp updates." });
      return;
    }
    if (!["failed", "not_configured"].includes(order.whatsappConfirmationStatus)) {
      res.status(409).json({ error: "This WhatsApp confirmation is not available for retry." });
      return;
    }
    await sendOrderConfirmationWhatsApp(order._id);
    const updated = await Order.findById(order._id).select("whatsappConfirmationStatus");
    if (updated?.whatsappConfirmationStatus !== "sent") {
      res.status(502).json({ error: "WhatsApp confirmation could not be sent. Check the API configuration and logs." });
      return;
    }
    res.json({ whatsappConfirmationStatus: updated.whatsappConfirmationStatus });
  }),
);

router.patch(
  "/orders/:id/status",
  validateBody(orderStatusSchema),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid order id." });
      return;
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.status === "refunded" || order.status === "cancelled") {
      res.status(409).json({ error: "This order is already closed." });
      return;
    }
    if (req.body.status === "cancelled" && order.paymentStatus === "created") {
      order.status = "cancelled";
      order.paymentStatus = "failed";
      await order.save();
      res.json({ order });
      return;
    }
    if (req.body.status !== "refunded" && req.body.status !== "cancelled" && order.paymentStatus !== "paid") {
      res.status(409).json({ error: "Only paid orders can move to fulfillment or refund statuses." });
      return;
    }
    if (req.body.status === "refunded" || req.body.status === "cancelled") {
      if (!order.razorpayPaymentId) {
        res.status(409).json({ error: "This order has no captured payment to refund." });
        return;
      }
      if (order.paymentStatus === "refund_pending") {
        res.status(409).json({ error: "A refund is already being processed for this order." });
        return;
      }
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $in: ["paid", "refund_failed"] }, status: order.status },
        { $set: { paymentStatus: "refund_pending" } },
        { new: true },
      );
      if (!claimed) {
        res.status(409).json({ error: "This order is already being updated." });
        return;
      }
      let refundStatus: string;
      try {
        const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
          amount: order.amount * 100,
          notes: { orderId: order.id, requestedBy: req.user?.email ?? "admin" },
        });
        refundStatus = refund.status;
      } catch (error) {
        await Order.updateOne(
          { _id: order._id, paymentStatus: "refund_pending" },
          { $set: { paymentStatus: "paid" } },
        );
        throw error;
      }
      await Order.updateOne(
        { _id: order._id, status: order.status, paymentStatus: "refund_pending" },
        { $set: refundStatus === "processed"
          ? { status: req.body.status === "cancelled" ? "cancelled" : "refunded", paymentStatus: "refunded" }
          : refundStatus === "failed"
            ? { status: "refund_failed", paymentStatus: "refund_failed" }
            : { status: req.body.status === "cancelled" ? "cancelled" : order.status, paymentStatus: "refund_pending" } },
      );
      const updatedOrder = await Order.findById(order._id);
      res.json({ order: updatedOrder, refundStatus });
      return;
    }
    const allowedTransitions: Record<string, string[]> = {
      paid: ["shipped"],
      processing: ["shipped"],
      shipped: ["delivered"],
      delivered: [],
    };
    if (!allowedTransitions[order.status]?.includes(req.body.status)) {
      res.status(409).json({ error: `Cannot move an order from ${order.status} to ${req.body.status}.` });
      return;
    }
    order.status = req.body.status;
    if (req.body.status === "shipped") {
      order.trackingUrl = req.body.trackingUrl;
      order.trackingNumber = req.body.trackingNumber;
      order.dispatchedAt = new Date();
    }
    await order.save();
    res.json({ order });
  }),
);

export default router;
