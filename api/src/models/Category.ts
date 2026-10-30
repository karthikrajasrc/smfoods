import { model, Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Category = model("Category", categorySchema);
