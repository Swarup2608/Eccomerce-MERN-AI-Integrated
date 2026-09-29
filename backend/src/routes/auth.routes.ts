import { Router } from "express";
import {
    getMeController,
    loginUserController,
    logoutAllController,
    logoutController,
    refreshController,
    registerUserController,
} from "../modules/User/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate, verifyRefreshToken } from "../middleware/auth.js";
import { loginRateLimiter, refreshRateLimiter, registerRateLimiter } from "../utils/rateLimiter.js";
import { loginSchema, registerSchema } from "../modules/User/auth.validator.js";

const router = Router();

// Auth responses carry user data and set credentials: never let a browser or proxy cache them
router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// Rate limiters run before validation so malformed requests still count towards the limit
router.post("/register", registerRateLimiter, validate(registerSchema), registerUserController);
router.post("/login", loginRateLimiter, validate(loginSchema), loginUserController);
router.post("/refresh", refreshRateLimiter, verifyRefreshToken, refreshController);
router.post("/logout", logoutController);
router.post("/logout-all", authenticate, logoutAllController);
router.get("/me", authenticate, getMeController);

export default router;
