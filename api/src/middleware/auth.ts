import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { config, adminEmails, isProduction } from "../config.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);
const cookieName = "smfoods_session";
const sessionDurationSeconds = 60 * 60 * 24 * 7;

export const authCookie = {
  name: cookieName,
  options: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/api",
    maxAge: sessionDurationSeconds * 1000,
  },
};

export function setUserSession(res: Parameters<RequestHandler>[1], userId: string) {
  const session = jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: sessionDurationSeconds });
  res.cookie(authCookie.name, session, authCookie.options);
}

export const googleLogin = asyncHandler(async (req, res) => {
  const token = typeof req.body?.credential === "string" ? req.body.credential : "";
  if (!token || token.length > 8192) {
    res.status(400).json({ error: "A valid Google credential is required." });
    return;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: config.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true || !payload.name) {
    res.status(401).json({ error: "Google did not provide a verified account." });
    return;
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = payload.sub;
      user.name = payload.name;
      user.picture = payload.picture ?? "";
      await user.save();
    } else {
      user = await User.create({
        googleId: payload.sub,
        email,
        name: payload.name,
        picture: payload.picture ?? "",
      });
    }
  } else {
    user.email = email;
    user.name = payload.name;
    user.picture = payload.picture ?? "";
    await user.save();
  }
  setUserSession(res, user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: adminEmails.has(user.email),
    },
  });
});

export const requireUser: RequestHandler = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[cookieName];
  if (typeof token !== "string") {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (typeof decoded === "string" || typeof decoded.sub !== "string" || !Types.ObjectId.isValid(decoded.sub)) {
      res.status(401).json({ error: "Your session is invalid. Sign in again." });
      return;
    }
    userId = decoded.sub;
  } catch {
    res.status(401).json({ error: "Your session has expired. Sign in again." });
    return;
  }

  const user = await User.findById(userId).select("email name").lean();
  if (!user) {
    res.status(401).json({ error: "Your account could not be found. Sign in again." });
    return;
  }
  req.user = { id: new Types.ObjectId(user._id), email: user.email, name: user.name };
  next();
});

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user || !adminEmails.has(req.user.email.toLowerCase())) {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }
  next();
};

export const optionalUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[cookieName];
  if (typeof token !== "string") {
    next();
    return;
  }
  let userId: string;
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (typeof decoded === "string" || typeof decoded.sub !== "string" || !Types.ObjectId.isValid(decoded.sub)) {
      next();
      return;
    }
    userId = decoded.sub;
  } catch {
    next();
    return;
  }
  const user = await User.findById(userId).select("email name").lean();
  if (user) req.user = { id: new Types.ObjectId(user._id), email: user.email, name: user.name };
  next();
});

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(authCookie.name, { ...authCookie.options, maxAge: undefined });
  res.status(204).end();
};

export const currentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.user.id.toString(),
      email: req.user.email,
      name: req.user.name,
      isAdmin: adminEmails.has(req.user.email.toLowerCase()),
    },
  });
});
