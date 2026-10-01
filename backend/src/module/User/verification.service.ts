import { generateRandomToken, hashToken } from "../../utils/token.js";
import { EmailVerification } from "./emailVerification.model.js";
import { AppError } from "../../errors/AppError.js";
import { User } from "./user.model.js";
import env from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export const sendEmailVerification = async (userId: string, email: string) => {
    // Implementation for sending email verification
    await EmailVerification.deleteMany({ userId});
    const token = generateRandomToken(32);
    const hashedToken = hashToken(token);

    const emailVerification = new EmailVerification({
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
    });
    await emailVerification.save();
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    logger.info("Email verification URL Generated",{
        userId,
        verificationUrl,
    })

    return {
        "message": "Email verification sent successfully to " + email,
        "verificationUrl": verificationUrl
    }
};

export const verifyEmail = async (userId: string, token: string) => {
    // Implementation for verifying email using the token
    const tokenHash = hashToken(token);
    const verification = await EmailVerification.findOne({ userId: userId, token: tokenHash });
    if (!verification) {
        throw new AppError(400,"INVALID_VERIFICATION_TOKEN","Invalid or expired email verification token");
    }
    if(verification.expiresAt.getTime() < new Date().getTime()) {
        await EmailVerification.deleteOne({ userId });
        throw new AppError(400,"INVALID_VERIFICATION_TOKEN","Invalid or expired verification token");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    if (user.emailVerified) {
        await EmailVerification.deleteOne({ userId });
        return {
            message : "Email is already verified"
        }
    }
    user.emailVerified = true;
    await user.save();

    await EmailVerification.deleteOne();
    return {
        "message": "Email verified successfully"
    };

};

export const sendPhoneNumberVerification = async (userId: string, phoneNumber: string) => {
    // Implementation for sending phone number verification
};

export const verifyPhoneNumber = async (token: string) => {
    // Implementation for verifying phone number using the token
};