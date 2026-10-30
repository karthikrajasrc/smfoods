import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config.js";
import { HttpError } from "../utils/HttpError.js";
import multer from "multer";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? "Each image must be 5 MB or smaller." : "Upload up to 5 image files.",
    });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid request data.", details: error.flatten().fieldErrors });
    return;
  }
  if (error?.code === 11000) {
    res.status(409).json({ error: "A record with that value already exists." });
    return;
  }
  if (error?.name === "ValidationError") {
    res.status(400).json({ error: "The submitted data is invalid." });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error("API request failed:", error);
  res.status(500).json({
    error: "An unexpected server error occurred.",
    ...(isProduction ? {} : { details: error instanceof Error ? error.message : String(error) }),
  });
};
