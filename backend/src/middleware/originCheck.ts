import type { Request, Response, NextFunction } from "express";
import env from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF defence in depth on top of SameSite=Strict cookies: browsers always send Origin on
// cross-site state-changing requests, so any Origin outside the allowlist is rejected.
// Requests without Origin (curl, server-to-server) carry no ambient browser cookies to abuse.
export function originCheck(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }
    const origin = req.header("origin");
    if (origin && !env.CORS_ORIGINS.includes(origin)) {
        return next(new AppError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed"));
    }
    next();
}
