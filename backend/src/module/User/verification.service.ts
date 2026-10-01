import { randomInt } from "crypto";
import { generateRandomToken, hashToken } from "../../utils/token.js";
import { EmailVerification } from "./emailVerification.model.js";
import { AppError } from "../../errors/AppError.js";
import { User } from "./user.model.js";
import env from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { sendMail } from "../../utils/mailer.js";
import { sendSms } from "../../utils/sms.js";
import { redisClient } from "../../config/redis.js";

const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000; // 1 hour
const PHONE_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
// A 6-digit code has 1,000,000 possibilities: five tries give a guesser a 0.0005% chance
const PHONE_OTP_MAX_ATTEMPTS = 5;

export const sendEmailVerification = async (userId: string, email: string) => {
    // Only the newest link is valid: issuing a new one revokes any earlier token
    await EmailVerification.deleteMany({ userId });
    const token = generateRandomToken(32);

    // Only the hash is stored, so a database leak does not expose usable tokens
    await EmailVerification.create({
        userId,
        token: hashToken(token),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    // The raw token only ever goes to the mailbox owner: never to logs or API responses
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendMail({
        to: email,
        subject: "Verify your email address",
        text: `Verify your email address by opening this link: ${verificationUrl}\n\nThe link expires in 1 hour. If you did not create an account, you can ignore this email.`,
        html: `<p>Verify your email address by clicking the link below.</p><p><a href="${verificationUrl}">Verify email</a></p><p>The link expires in 1 hour. If you did not create an account, you can ignore this email.</p>`,
    });
    logger.info("Email verification sent", { userId });
};

// Looks the user up by email for an authenticated resend request
export const resendEmailVerification = async (userId: string) => {
    const user = await User.findById(userId).select("email emailVerified").lean();
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    if (user.emailVerified) {
        return { message: "Email is already verified" };
    }
    await sendEmailVerification(userId, user.email);
    return { message: "Verification email sent" };
};

// The token alone identifies the user, so the link works on a device that is not logged in
export const verifyEmail = async (token: string) => {
    // Find and delete in one step so a token can never be redeemed twice, even by concurrent requests
    const verification = await EmailVerification.findOneAndDelete({
        token: hashToken(token),
        expiresAt: { $gt: new Date() },
    });
    if (!verification) {
        throw new AppError(400, "INVALID_VERIFICATION_TOKEN", "Invalid or expired email verification token");
    }

    const result = await User.updateOne({ _id: verification.userId }, { $set: { emailVerified: true } });
    if (result.matchedCount === 0) {
        throw new AppError(400, "INVALID_VERIFICATION_TOKEN", "Invalid or expired email verification token");
    }
    logger.info("Email verified", { userId: verification.userId.toString() });

    return { message: "Email verified successfully" };
};

const phoneOtpKey = (userId: string) => `auth:phone-otp:${userId}`;

// The code is bound to the user and the number it was sent to, so it dies if the number changes
const hashPhoneOtp = (userId: string, phoneNumber: string, code: string) => hashToken(`${userId}:${phoneNumber}:${code}`);

export const PHONE_OTP_RESULT = {
    VERIFIED: 1,
    WRONG_CODE: 0,
    NOT_FOUND: -1,
    TOO_MANY_ATTEMPTS: -2,
} as const;

// Compare and count in one step, so parallel guesses cannot get more than PHONE_OTP_MAX_ATTEMPTS
// tries at a 6-digit code. A correct code is deleted, so it works exactly once.
const VERIFY_PHONE_OTP_SCRIPT = `
local codeHash = redis.call('HGET', KEYS[1], 'codeHash')
if not codeHash then return -1 end
if redis.call('HINCRBY', KEYS[1], 'attempts', 1) > tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  return -2
end
if codeHash == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return 1
end
return 0
`;

export const sendPhoneNumberVerification = async (userId: string, phoneNumber: string) => {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

    // Only the newest code is valid: storing a new one replaces the earlier code and its attempt count
    await redisClient
        .multi()
        .del(phoneOtpKey(userId))
        .hset(phoneOtpKey(userId), { codeHash: hashPhoneOtp(userId, phoneNumber, code), attempts: "0" })
        .expire(phoneOtpKey(userId), PHONE_OTP_TTL_SECONDS)
        .exec();

    // The code only ever goes to the phone: never to logs or API responses
    await sendSms(phoneNumber, `Your verification code is ${code}. It expires in 10 minutes. Do not share it with anyone.`);
    logger.info("Phone verification code sent", { userId });
};

// Looks the phone number up for an authenticated send or resend request
export const requestPhoneNumberVerification = async (userId: string) => {
    const user = await User.findById(userId).select("phoneNumber phoneNumberVerified").lean();
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    if (user.phoneNumberVerified) {
        return { message: "Phone number is already verified" };
    }
    await sendPhoneNumberVerification(userId, user.phoneNumber);
    return { message: "Verification code sent" };
};

export const verifyPhoneNumber = async (userId: string, code: string) => {
    const user = await User.findById(userId).select("phoneNumber phoneNumberVerified").lean();
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    if (user.phoneNumberVerified) {
        return { message: "Phone number is already verified" };
    }

    const result = await redisClient.eval(
        VERIFY_PHONE_OTP_SCRIPT,
        1,
        phoneOtpKey(userId),
        hashPhoneOtp(userId, user.phoneNumber, code),
        PHONE_OTP_MAX_ATTEMPTS.toString(),
    );
    if (result === PHONE_OTP_RESULT.TOO_MANY_ATTEMPTS) {
        throw new AppError(429, "TOO_MANY_VERIFICATION_ATTEMPTS", "Too many incorrect codes, please request a new one");
    }
    if (result !== PHONE_OTP_RESULT.VERIFIED) {
        throw new AppError(400, "INVALID_VERIFICATION_CODE", "Invalid or expired verification code");
    }

    await User.updateOne({ _id: userId }, { $set: { phoneNumberVerified: true } });
    logger.info("Phone number verified", { userId });

    return { message: "Phone number verified successfully" };
};
