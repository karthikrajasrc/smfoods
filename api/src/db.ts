import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDatabase() {
  await mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.info("Connected to MongoDB");
}
