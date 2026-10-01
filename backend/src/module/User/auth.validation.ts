import { z } from "zod";

// Upper bound stops multi-megabyte passwords from tying up argon2 (a cheap DoS)
const PASSWORD_MAX = 128;

const passwordSchema = z.string().min(8, "Password must be at least 8 characters long").max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters long`).regex(/[a-z]/, "Password must contain a lowercase letter").regex(/[A-Z]/, "Password must contain an uppercase letter").regex(/[0-9]/, "Password must contain a number") .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

// Trim and lowercase run before the format check, so " A@B.com " is accepted and normalised
const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Invalid email address"));

// Unknown keys (role, status, emailVerified, ...) are stripped, so they can never reach the model
const registerSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    email: emailSchema,
    password: passwordSchema,
    username: z.string().trim().min(3, "Username must be at least 3 characters long").max(30, "Username must be at most 30 characters long").regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and dots"),
    phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Invalid phone number"),
    country: z.string().trim().min(1, "Country is required").max(56),
});

// No strength rules on login: they would leak the password policy and lock out nobody
const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Verification token is required"),
});

export const verifyPhoneSchema = z.object({
    code: z.string().trim().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;

export { registerSchema, loginSchema };
