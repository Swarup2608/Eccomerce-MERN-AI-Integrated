import type {Request, Response, NextFunction} from "express";
import {AppError} from "../errors/AppError.js"

export const requireVerifiedUser = async (req:Request, _res:Response, next:NextFunction) => {
    try{
        if(!req.user){
            throw new AppError(401, "AUTH_REQUIRED","Authentication is required");
        }
        if(!req.user.emailVerified || !req.user.phoneNumberVerified){
            throw new AppError(403, "VERIFICATION_REQUIRED", "Email and phone number verification are required");
        }
        next();
    }catch(err){
        next(err);
    }
}
