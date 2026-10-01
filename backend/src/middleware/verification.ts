import type {Request, Response, NextFunction} from "express";
import {AppError} from "../errors/AppError.js"

// All three must run after authenticate, which loads the verification flags from the database
// on every request: a user who has just verified is let through without logging in again.
// Each failure has its own code so the client knows which verification screen to show.
const verificationGuard = (options: { email: boolean; phone: boolean }) => (req:Request, _res:Response, next:NextFunction) => {
    if(!req.user){
        return next(new AppError(401, "AUTH_REQUIRED","Authentication is required"));
    }
    if(options.email && !req.user.emailVerified){
        return next(new AppError(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification is required"));
    }
    if(options.phone && !req.user.phoneNumberVerified){
        return next(new AppError(403, "PHONE_VERIFICATION_REQUIRED", "Phone number verification is required"));
    }
    next();
};

export const requireEmailVerified = verificationGuard({ email: true, phone: false });

export const requirePhoneVerified = verificationGuard({ email: false, phone: true });

// Email and phone number must both be verified
export const requireVerifiedUser = verificationGuard({ email: true, phone: true });
