import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    picture: { type: String, default: "" },
    passwordHash: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true, name: "email_unique" });

export const User = model("User", userSchema);
