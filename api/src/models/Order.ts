import { model, Schema } from "mongoose";

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, required: true },
    packageSize: { type: Number, min: 0.01, max: 10000 },
    packageUnit: { type: String, enum: ["kg", "g", "L", "ml"] },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    whatsappPhone: { type: String, required: true, trim: true, maxlength: 24 },
    whatsappOptIn: { type: Boolean, required: true, default: false },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    orderNumber: { type: String, unique: true, sparse: true, immutable: true },
    items: { type: [orderItemSchema], required: true },
    customer: { type: customerSchema, required: true },
    subtotal: { type: Number, min: 1 },
    deliveryCharge: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 1 },
    deliveryCarrier: { type: String, trim: true, maxlength: 120 },
    trackingNumber: { type: String, trim: true, maxlength: 120 },
    trackingUrl: { type: String, trim: true, maxlength: 2048 },
    dispatchedAt: { type: Date },
    whatsappConfirmationStatus: {
      type: String,
      enum: ["pending", "sending", "sent", "failed", "not_configured", "not_opted_in"],
      default: "pending",
    },
    whatsappConfirmationAttemptedAt: { type: Date },
    currency: { type: String, default: "INR", immutable: true },
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refund_pending", "refund_failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: { type: String, enum: ["created", "paid", "failed", "refund_pending", "refund_failed", "refunded"], default: "created" },
    razorpayOrderId: { type: String, required: true, unique: true, sparse: true },
    razorpayPaymentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
export const Order = model("Order", orderSchema);
