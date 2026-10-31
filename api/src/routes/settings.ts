import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DEFAULT_BRAND_CONTACT, getStateDeliveryCharges, StoreSettings } from "../models/StoreSettings.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [settings, deliveryCharges] = await Promise.all([
      StoreSettings.findById("storefront").select("heroImages heroMobileImages brandPhone brandEmail brandAddress").lean(),
      getStateDeliveryCharges(),
    ]);
    res.json({
      deliveryCharges,
      heroImages: settings?.heroImages ?? [],
      heroMobileImages: settings?.heroMobileImages ?? [],
      brandContact: {
        phone: settings?.brandPhone ?? DEFAULT_BRAND_CONTACT.phone,
        email: settings?.brandEmail ?? DEFAULT_BRAND_CONTACT.email,
        address: settings?.brandAddress ?? DEFAULT_BRAND_CONTACT.address,
      },
    });
  }),
);

export default router;
