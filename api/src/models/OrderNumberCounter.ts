import { model, Schema } from "mongoose";

const orderNumberCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true },
  },
  { versionKey: false },
);

export const OrderNumberCounter = model("OrderNumberCounter", orderNumberCounterSchema);
