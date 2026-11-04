import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { handleRazorpayWebhook } from "./routes/orders.js";
import whatsappWebhookRoutes from "./routes/whatsappWebhook.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import orderRoutes from "./routes/orders.js";
import settingsRoutes from "./routes/settings.js";

const app = express();
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
app.disable("x-powered-by");
if (config.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: config.UI_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.post(
  "/api/payments/razorpay/webhook",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "64kb" }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: "Expected a JSON webhook payload." });
        return;
      }
      await handleRazorpayWebhook(req.body, req.get("x-razorpay-signature"));
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  },
);

app.use(
  "/api/webhooks/whatsapp",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "64kb" }),
  whatsappWebhookRoutes,
);

app.use(express.json({ limit: "32kb", strict: true }));
app.use(cookieParser());
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
