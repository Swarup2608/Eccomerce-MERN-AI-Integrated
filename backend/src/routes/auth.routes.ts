import { Router } from "express";
import { registerUserController } from "../modules/User/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerRateLimiter } from "../utils/rateLimiter.js";
import { registerSchema } from "../modules/User/auth.validator.js";

const router = Router();

router.post("/register", validate(registerSchema), registerRateLimiter, registerUserController);

export default router;