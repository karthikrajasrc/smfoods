import { model, Schema } from "mongoose";

const productVariantSchema = new Schema(
  {
    size: { type: Number, required: true, min: 0.01, max: 10000 },
    unit: { type: String, enum: ["kg", "g", "L", "ml"], required: true },
    price: { type: Number, required: true, min: 1 },
    compareAtPrice: { type: Number, min: 1 },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    price: { type: Number, required: true, min: 1 },
    compareAtPrice: { type: Number, min: 1 },
    packageSize: { type: Number, min: 0.01, max: 10000 },
    packageUnit: { type: String, enum: ["kg", "g", "L", "ml"] },
    image: { type: String, required: true, maxlength: 2048 },
    images: { type: [String], default: undefined },
    variants: { type: [productVariantSchema], default: undefined },
    stock: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    featured: { type: Boolean, default: false },
    showInCombos: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ active: 1, featured: -1, createdAt: -1 });
export const Product = model("Product", productSchema);
