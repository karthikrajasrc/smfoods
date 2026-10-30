import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  UI_ORIGIN: z.string().url(),
  MONGODB_URI: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().default(""),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(""),
  CLOUDINARY_API_KEY: z.string().trim().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().trim().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().trim().default(""),
  WHATSAPP_TEMPLATE_NAME: z.string().trim().default(""),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().trim().default("en"),
  WHATSAPP_GRAPH_API_VERSION: z.string().trim().regex(/^v\d+\.\d+$/).default("v23.0"),
  WHATSAPP_COUNTRY_CODE: z.string().trim().regex(/^\d{1,3}$/).default("91"),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Invalid API environment configuration:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("API configuration is invalid. Check api/.env against api/.env.example.");
}

export const config = parsedEnv.data;
export const adminEmails = new Set(
  config.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
);
export const isProduction = config.NODE_ENV === "production";

const cloudinaryValues = [
  config.CLOUDINARY_CLOUD_NAME,
  config.CLOUDINARY_API_KEY,
  config.CLOUDINARY_API_SECRET,
];
if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
  throw new Error("Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together.");
}

export const cloudinaryConfigured = cloudinaryValues.every(Boolean);
export const cloudinaryImageBasePath = `/${config.CLOUDINARY_CLOUD_NAME}/image/upload/`;

const whatsappValues = [
  config.WHATSAPP_ACCESS_TOKEN,
  config.WHATSAPP_PHONE_NUMBER_ID,
  config.WHATSAPP_TEMPLATE_NAME,
];
if (whatsappValues.some(Boolean) && !whatsappValues.every(Boolean)) {
  throw new Error("WhatsApp configuration is incomplete. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_NAME together.");
}

export const whatsappConfigured = whatsappValues.every(Boolean);
