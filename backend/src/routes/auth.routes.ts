import { Router } from "express";
import {
    RegisterUserController,
} from "../module/User/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerRateLimiter } from "../utils/rateLimiter.js";
import { registerSchema } from "../module/User/auth.validation.js";

const router = Router();

// Auth responses carry user data and set credentials: never let a browser or proxy cache them
router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// Rate limiters run before validation so malformed requests still count towards the limit
router.post("/register", registerRateLimiter, validate(registerSchema), RegisterUserController);

export default router;
