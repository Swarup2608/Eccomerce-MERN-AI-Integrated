import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireVerifiedUser } from "../middleware/verification.js";

const router = Router();

// Default deny: everything under /api/v1 that is not explicitly mounted before this router in
// app.ts needs a logged-in user with a verified email and phone number. New feature routers
// (products, cart, orders, ...) are mounted below and get the guards without repeating them.
// A route that should be reachable with less goes in app.ts ahead of this router, guarded by
// authenticate alone, requireEmailVerified or requirePhoneVerified as needed.
router.use(authenticate, requireVerifiedUser);

export default router;
