import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DEFAULT_BRAND_CONTACT, StoreSettings } from "../models/StoreSettings.js";

const router = Router();

router.get(
  "/banner",
  asyncHandler(async (req, res) => {
    const { device } = z.object({ device: z.enum(["desktop", "mobile"]) }).parse(req.query);
    const field = device === "mobile" ? "heroMobileImages" : "heroImages";
    const settings = await StoreSettings.findById("storefront").select(field).lean();
    res.json({ images: settings?.[field] ?? [] });
  }),
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await StoreSettings.findById("storefront")
      .select("deliveryCharge deliveryCharges brandPhone brandEmail brandAddress")
      .lean();
    res.json({
      deliveryCharges: (settings?.deliveryCharges ?? [])
        .filter(({ enabled }) => enabled === true)
        .map(({ state, amount }) => ({ state, amount })),
      brandContact: {
        phone: settings?.brandPhone ?? DEFAULT_BRAND_CONTACT.phone,
        email: settings?.brandEmail ?? DEFAULT_BRAND_CONTACT.email,
        address: settings?.brandAddress ?? DEFAULT_BRAND_CONTACT.address,
      },
    });
  }),
);

export default router;
