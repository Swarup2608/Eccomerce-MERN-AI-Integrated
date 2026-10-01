import type { LoginInput, RegisterInput } from "./auth.validation.js";
import { User, USER_STATUSES, type IUser } from "./user.model.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { toUserResponseDto } from "./auth.dto.js";
import {AppError} from "../../errors/AppError.js";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import { startSession, rotateSession, revokeSession, revokeAllSessions, ROTATE_RESULT } from "../../utils/session.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import { rethrowError } from "../../errors/ReThrown.js";
import { sendEmailVerification, sendPhoneNumberVerification } from "./verification.service.js";
import { sendMail } from "../../utils/mailer.js";
import env from "../../config/env.js";

// Verified against when the email is unknown, so a miss costs the same time as a wrong
// password and response timing can't be used to find out which emails are registered
let dummyHashPromise: Promise<string> | undefined;
const getDummyHash = () => (dummyHashPromise ??= hashPassword("dummy-password-for-timing"));

const assertUserIsActive = (user: Pick<IUser, "status">) => {
    if (user.status === USER_STATUSES.ACTIVE) {
        return;
    }
    if (user.status === USER_STATUSES.SUSPENDED) {
        throw new AppError(403, "SUSPENDED_USER", "The user account is suspended");
    }
    if (user.status === USER_STATUSES.DELETED) {
        throw new AppError(403, "DELETED_USER", "The user account has been deleted");
    }
    throw new AppError(403, "INACTIVE_USER", "The user account is not active");
};




// Fire-and-forget: the response must not wait on these. A mail or SMS outage is recoverable through
// the resend routes, and waiting would make a new registration measurably slower than a duplicate one.
const inBackground = (task: Promise<unknown>, failureMessage: string, userId?: string) => {
    task.catch((error: unknown) => {
        logger.error(failureMessage, { userId, error: error instanceof Error ? error.message : error });
    });
};

// Tells the real owner of an email that someone tried to register with it again
const sendAccountExistsNotice = (email: string) => sendMail({
    to: email,
    subject: "You already have an account",
    text: `Someone tried to create an account with this email address, but one already exists. If this was you, log in here: ${env.FRONTEND_URL}/login\n\nIf it was not you, you can ignore this email: your account has not been changed.`,
    html: `<p>Someone tried to create an account with this email address, but one already exists.</p><p>If this was you, <a href="${env.FRONTEND_URL}/login">log in</a>.</p><p>If it was not you, you can ignore this email: your account has not been changed.</p>`,
});

// Register a new user.
// The caller gets the same answer whether the account was created or the email or phone number was
// already registered, so registration cannot be used to find out who has an account. That is also
// why registering does not log the user in: a session would give the difference away. The outcome
// goes to the mailbox instead: a verification link for a new account, a notice for an existing one.
// Usernames are public identifiers, so a taken username is the one conflict that is reported.
export const registerUser = async (userInput : RegisterInput): Promise<void> => {
    const hashedPassword = await hashPassword(userInput.password);
    try{
        const newUser = await User.create({
            ...userInput,
            passwordHash: hashedPassword
        });
        const userId = newUser._id.toString();
        inBackground(sendEmailVerification(userId, newUser.email), "Failed to send verification email", userId);
        inBackground(sendPhoneNumberVerification(userId, newUser.phoneNumber), "Failed to send phone verification code", userId);
    } catch (error) {
        // Check the code directly: mongoose bundles its own mongodb driver, so instanceof is unreliable
        if((error as { code?: number }).code === 11000){
            // The driver only reports the first index that clashed, so each field is looked up explicitly:
            // the answer must depend on the username alone, never on whether the email or phone exists
            const [usernameTaken, emailOwner] = await Promise.all([
                User.exists({ username: userInput.username.toLowerCase() }),
                User.exists({ email: userInput.email }),
            ]);
            if (usernameTaken) {
                throw new AppError(409, "USERNAME_TAKEN", "This username is already taken");
            }
            logger.warn("Duplicate user registration", { duplicate: emailOwner ? "email" : "phoneNumber" });
            if (emailOwner) {
                inBackground(sendAccountExistsNotice(userInput.email), "Failed to send account exists notice");
            }
            return;
        }
        if(error instanceof mongoose.Error.ValidationError) {
            logger.error("Validation error");
            throw new AppError(400, "VALIDATION_ERROR", "Invalid user input");
        }
        return rethrowError(error, "register user");
    }

};

// Login a user: every login starts its own session, so each device can be logged out separately
export const loginUser = async (loginInput: LoginInput) => {
    try {
        // passwordHash is select:false on the schema, so it has to be requested explicitly
        const user = await User.findOne({ email: loginInput.email }).select("+passwordHash");
        const passwordMatches = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), loginInput.password);
        // Same 401 for unknown email and wrong password so the response doesn't reveal which emails exist
        if (!user || !passwordMatches) {
            throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
        }
        // Checked after the password, so account status is only revealed to someone who knows it
        assertUserIsActive(user);

        await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

        const { accessToken, refreshToken } = await startSession(user);
        return { user: toUserResponseDto(user), accessToken, refreshToken };
    } catch (error) {
        return rethrowError(error, "log in the user");
    }
};

// Exchange a valid refresh token for a new token pair. Each refresh token works exactly once.
// Returns null when a concurrent request already rotated this token: the caller keeps the
// cookies that request set and no second pair is issued.
export const refreshSession = async (userId: string, sessionId: string, jti: string, issuedAt: number) => {
    try {
        const user = await User.findById(userId).select("role status passwordChangedAt").lean();
        // Tokens issued before the last password change are dead, same rule as in authenticate
        const passwordChanged = Boolean(user?.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > issuedAt);
        if (!user || user.status !== USER_STATUSES.ACTIVE || passwordChanged) {
            await revokeSession(userId, sessionId);
            throw new AppError(401, "SESSION_REVOKED", "Please log in again");
        }

        const { token: refreshToken, jti: nextJti } = signRefreshToken(userId, sessionId);
        const result = await rotateSession(userId, sessionId, jti, nextJti);

        if (result === ROTATE_RESULT.REUSED) {
            // An already-used refresh token came back: it was stolen or replayed, the session is now revoked
            logger.warn("Refresh token reuse detected, session revoked", { userId, sessionId });
            throw new AppError(401, "REFRESH_TOKEN_REUSED", "Please log in again");
        }
        if (result === ROTATE_RESULT.NOT_FOUND) {
            throw new AppError(401, "SESSION_EXPIRED", "Please log in again");
        }
        if (result === ROTATE_RESULT.ALREADY_ROTATED) {
            return null;
        }

        // Role is re-read from the database, so a role change reaches the token on the next refresh
        const { token: accessToken } = signAccessToken(userId, sessionId, user.role);
        return { accessToken, refreshToken };
    } catch (error) {
        return rethrowError(error, "refresh the session");
    }
};

// End one session (this device)
export const logoutUser = async (userId: string, sessionId: string): Promise<void> => {
    try {
        await revokeSession(userId, sessionId);
    } catch (error) {
        rethrowError(error, "log out");
    }
};

// End every session of the user (all devices)
export const logoutAllSessions = async (userId: string): Promise<void> => {
    try {
        await revokeAllSessions(userId);
    } catch (error) {
        rethrowError(error, "log out of all sessions");
    }
};

// Get the currently authenticated user's details
export const getCurrentUser = async (userId: string) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }
        return toUserResponseDto(user);
    } catch (error) {
        return rethrowError(error, "fetch user details");
    }
};
