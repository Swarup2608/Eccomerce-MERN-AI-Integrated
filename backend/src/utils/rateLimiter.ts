import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisRateLimitStore } from "./rateLimitStore.js";

export const apiRateLimiter = rateLimit({
    store: new RedisRateLimitStore("api"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
        }
    }
});

export const registerRateLimiter = rateLimit({
    store: new RedisRateLimitStore("register"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs for registration
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many registration attempts, please try again later.'
        }
    }
});

export const loginRateLimiter = rateLimit({
    store: new RedisRateLimitStore("login"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 failed logins per windowMs to slow down password guessing
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts, please try again later.'
        }
    }
});

export const refreshRateLimiter = rateLimit({
    store: new RedisRateLimitStore("refresh"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // limit each IP to 60 token refreshes per windowMs
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
        }
    }
});

export const verifyEmailRateLimiter = rateLimit({
    store: new RedisRateLimitStore("verify-email"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 verification attempts per windowMs to stop token guessing
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification attempts, please try again later.'
        }
    }
});

// The limiters below run after authenticate, so they are keyed by user: one account cannot be used
// to flood a mailbox or phone from many IPs, and users behind a shared IP do not consume each other's allowance
const userKeyGenerator = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "");

export const resendVerificationRateLimiter = rateLimit({
    store: new RedisRateLimitStore("resend-verification"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each user to 3 verification emails per windowMs
    keyGenerator: userKeyGenerator,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification emails requested, please try again later.'
        }
    }
});

export const sendPhoneVerificationRateLimiter = rateLimit({
    store: new RedisRateLimitStore("send-phone-verification"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each user to 3 verification SMS per windowMs, every one costs money
    keyGenerator: userKeyGenerator,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification codes requested, please try again later.'
        }
    }
});

export const verifyPhoneRateLimiter = rateLimit({
    store: new RedisRateLimitStore("verify-phone"),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each user to 15 code checks per windowMs: 3 codes with 5 attempts each
    keyGenerator: userKeyGenerator,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification attempts, please try again later.'
        }
    }
});
