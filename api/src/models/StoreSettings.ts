import { model, Schema } from "mongoose";
import { INDIAN_STATES } from "../data/indiaStates.js";

const stateDeliveryChargeSchema = new Schema(
  {
    state: { type: String, enum: INDIAN_STATES, required: true },
    amount: { type: Number, required: true, min: 0, max: 1000000 },
  },
  { _id: false },
);
const storeSettingsSchema = new Schema(
  {
    _id: { type: String, default: "storefront" },
    deliveryCharge: { type: Number, required: true, min: 0, max: 1000000, default: 0 },
    deliveryCharges: { type: [stateDeliveryChargeSchema], default: [] },
    heroImages: { type: [String], default: [] },
    heroMobileImages: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const StoreSettings = model("StoreSettings", storeSettingsSchema);

export async function getDeliveryCharge(state: string) {
  const settings = await StoreSettings.findById("storefront").select("deliveryCharge deliveryCharges").lean();
  const stateCharge = settings?.deliveryCharges?.find((charge) => charge.state === state);
  return stateCharge?.amount ?? settings?.deliveryCharge ?? 0;
}

export async function getStateDeliveryCharges() {
  const settings = await StoreSettings.findById("storefront").select("deliveryCharge deliveryCharges").lean();
  const configuredCharges = new Map((settings?.deliveryCharges ?? []).map(({ state, amount }) => [state, amount]));
  return INDIAN_STATES.map((state) => ({
    state,
    amount: configuredCharges.get(state) ?? settings?.deliveryCharge ?? 0,
  }));
}
