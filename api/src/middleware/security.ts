import type { RequestHandler } from "express";
import { config } from "../config.js";

export const enforceSameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get("origin");
  if (origin !== config.UI_ORIGIN) {
    res.status(403).json({ error: "Request origin is not allowed." });
    return;
  }
  next();
};
