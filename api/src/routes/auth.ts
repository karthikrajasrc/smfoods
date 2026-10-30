import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { adminEmails } from "../config.js";
import { currentUser, googleLogin, logout, requireUser, setUserSession } from "../middleware/auth.js";
import { enforceSameOrigin } from "../middleware/security.js";
import { User } from "../models/User.js";
import { HttpError } from "../utils/HttpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
});
const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post("/google", enforceSameOrigin, loginLimiter, googleLogin);
router.post(
  "/register",
  enforceSameOrigin,
  credentialsLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;
    if (adminEmails.has(email)) {
      throw new HttpError("This administrator account must sign in with its verified Google account.", 403);
    }
    if (await User.exists({ email })) {
      throw new HttpError("An account with this email already exists. Sign in or use Google to continue.", 409);
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash });
    setUserSession(res, user.id);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: adminEmails.has(user.email),
      },
    });
  }),
);
router.post(
  "/login",
  enforceSameOrigin,
  credentialsLimiter,
  validateBody(passwordLoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof passwordLoginSchema>;
    if (adminEmails.has(email)) {
      throw new HttpError("This administrator account must sign in with its verified Google account.", 403);
    }
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError("Email or password is incorrect.", 401);
    }
    setUserSession(res, user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: adminEmails.has(user.email),
      },
    });
  }),
);
router.get("/me", (req, res, next) => {
  if (!req.cookies?.smfoods_session) {
    res.json({ user: null });
    return;
  }
  requireUser(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    if (res.headersSent) return;
    currentUser(req, res, next);
  });
});
router.post("/logout", enforceSameOrigin, logout);

export default router;
