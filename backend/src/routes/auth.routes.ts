import { Router } from "express";
import {
    RegisterUserController,
    LoginController,
    RefreshController,
    LogoutController,
    LogoutAllController,
    MeController,
    ResendVerificationController,
    VerifyEmailController,
    SendPhoneVerificationController,
    VerifyPhoneController,
} from "../module/User/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate, verifyRefreshToken } from "../middleware/auth.js";
import { loginRateLimiter, refreshRateLimiter, registerRateLimiter, resendVerificationRateLimiter, sendPhoneVerificationRateLimiter, verifyEmailRateLimiter, verifyPhoneRateLimiter } from "../utils/rateLimiter.js";
import { loginSchema, registerSchema, verifyEmailSchema, verifyPhoneSchema } from "../module/User/auth.validation.js";

const router = Router();

// Auth responses carry user data and set credentials: never let a browser or proxy cache them
router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// Rate limiters run before validation so malformed requests still count towards the limit

// Public: no session needed
router.post("/register", registerRateLimiter, validate(registerSchema), RegisterUserController);
router.post("/login", loginRateLimiter, validate(loginSchema), LoginController);
router.post("/refresh", refreshRateLimiter, verifyRefreshToken, RefreshController);
// No authenticate: logout must work with an expired access token, it reads the session from the cookies itself
router.post("/logout", LogoutController);
// The link is often opened on a device with no session, so the token is the only credential
router.post("/verify-email", verifyEmailRateLimiter, validate(verifyEmailSchema), VerifyEmailController);

// Logged in, verification not required: these are what an unverified user needs to become verified.
// authenticate runs before the limiters because they are keyed by user id
router.get("/me", authenticate, MeController);
router.post("/logout-all", authenticate, LogoutAllController);
router.post("/resend-verification", authenticate, resendVerificationRateLimiter, ResendVerificationController);
router.post("/send-phone-verification", authenticate, sendPhoneVerificationRateLimiter, SendPhoneVerificationController);
router.post("/verify-phone", authenticate, verifyPhoneRateLimiter, validate(verifyPhoneSchema), VerifyPhoneController);

export default router;
