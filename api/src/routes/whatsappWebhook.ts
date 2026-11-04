import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!config.WHATSAPP_VERIFY_TOKEN) {
    res.status(503).send("WhatsApp webhook verification is not configured.");
    return;
  }
  if (mode !== "subscribe" || token !== config.WHATSAPP_VERIFY_TOKEN || typeof challenge !== "string") {
    res.status(403).send("WhatsApp webhook verification failed.");
    return;
  }

  res.type("text/plain").status(200).send(challenge);
});

router.post("/", (req, res) => {
  if (!config.WHATSAPP_APP_SECRET) {
    res.status(503).json({ error: "WhatsApp webhook signature verification is not configured." });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "Expected a JSON webhook payload." });
    return;
  }

  const signature = req.get("x-hub-signature-256") ?? "";
  const match = /^sha256=([a-f\d]{64})$/i.exec(signature);
  if (!match) {
    res.status(401).json({ error: "Invalid WhatsApp webhook signature." });
    return;
  }

  const expected = createHmac("sha256", config.WHATSAPP_APP_SECRET).update(req.body).digest();
  const received = Buffer.from(match[1], "hex");
  if (!timingSafeEqual(expected, received)) {
    res.status(401).json({ error: "Invalid WhatsApp webhook signature." });
    return;
  }

  res.status(200).json({ received: true });
});

export default router;
