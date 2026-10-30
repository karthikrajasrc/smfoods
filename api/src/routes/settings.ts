import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStateDeliveryCharges, StoreSettings } from "../models/StoreSettings.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [settings, deliveryCharges] = await Promise.all([
      StoreSettings.findById("storefront").select("heroImages heroMobileImages").lean(),
      getStateDeliveryCharges(),
    ]);
    res.json({
      deliveryCharges,
      heroImages: settings?.heroImages ?? [],
      heroMobileImages: settings?.heroMobileImages ?? [],
    });
  }),
);

export default router;
