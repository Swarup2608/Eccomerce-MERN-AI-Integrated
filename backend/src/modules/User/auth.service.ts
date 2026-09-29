import { AppError } from "../../errors/AppError.js";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import type { LoginInput, RegisterInput } from "./auth.validator.js";
import { User, USER_STATUSES, USER_ROLES, type IUser } from "./user.model.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { toUserResponseDto, type UserResponseDto } from "./user.dto.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import { createSession,  newSessionId, revokeAllSessions, revokeSession, rotateSession, ROTATE_RESULT, } from "./session.store.js";

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResult {
    user: UserResponseDto;
    tokens: AuthTokens;
}

type UserDoc = mongoose.HydratedDocument<IUser>;

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

// Starts a new session (one per login/device) and issues its first token pair
const startSession = async (user: UserDoc): Promise<AuthTokens> => {
    const userId = user._id.toString();
    const sessionId = newSessionId();
    const { token: refreshToken, jti } = signRefreshToken(userId, sessionId);
    await createSession(userId, sessionId, jti);
    const accessToken = signAccessToken(userId, sessionId, user.role);
    return { accessToken, refreshToken };
};

const rethrowUnexpected = (error: unknown, action: string): never => {
    // Let expected errors (401/403/409) reach the global error handler unchanged
    if (error instanceof AppError) {
        throw error;
    }
    logger.error(`Failed to ${action}`, {
        error: error instanceof Error ? error.message : error,
    });
    throw new AppError(500, "INTERNAL_SERVER_ERROR", `An unexpected error occurred while trying to ${action}`);
};

// Register a new user and log them in
export const register = async (registerInput: RegisterInput): Promise<AuthResult> => {
    const passwordHash = await hashPassword(registerInput.password);
    try {
        // Fields are listed explicitly: nothing from the request body can set role, status or verification flags
        const newUser = new User({
            firstName: registerInput.firstName,
            lastName: registerInput.lastName,
            email: registerInput.email,
            username: registerInput.userName,
            phoneNumber: registerInput.phoneNumber,
            country: registerInput.country,
            passwordHash,
            role: USER_ROLES.USER,
            status: USER_STATUSES.ACTIVE,
            lastLoginAt: new Date(),
        });
        await newUser.save();
        const tokens = await startSession(newUser);
        return { user: toUserResponseDto(newUser), tokens };
    } catch (error) {
        // Check the code directly: mongoose bundles its own mongodb driver, so instanceof is unreliable
        if ((error as { code?: number }).code === 11000) {
            throw new AppError(
                409,
                "USER_ALREADY_EXISTS",
                "A user with the provided details already exists",
            );
        }
        if (error instanceof mongoose.Error.ValidationError) {
            throw new AppError(400, "VALIDATION_ERROR", error.message);
        }
        return rethrowUnexpected(error, "register the user");
    }
}

// Login a user
export const login = async (loginInput: LoginInput): Promise<AuthResult> => {
    try {
        // passwordHash is select:false on the schema, so it has to be requested explicitly
        const user = await User.findOne({ email: loginInput.email, role: USER_ROLES.USER }).select("+passwordHash");
        const passwordMatches = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), loginInput.password);
        // Same 401 for unknown email and wrong password so the response doesn't reveal which emails exist
        if (!user || !passwordMatches) {
            throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
        }
        assertUserIsActive(user);

        await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

        const tokens = await startSession(user);
        return { user: toUserResponseDto(user), tokens };
    } catch (error) {
        return rethrowUnexpected(error, "log in the user");
    }
}

// Exchange a valid refresh token for a new token pair. Each refresh token works exactly once.
export const refresh = async (userId: string, sessionId: string, jti: string): Promise<AuthTokens> => {
    try {
        const user = await User.findById(userId);
        if (!user || user.status !== USER_STATUSES.ACTIVE) {
            await revokeSession(userId, sessionId);
            throw new AppError(401, "SESSION_INVALID", "Please log in again");
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

        const accessToken = signAccessToken(userId, sessionId, user.role);
        return { accessToken, refreshToken };
    } catch (error) {
        return rethrowUnexpected(error, "refresh the session");
    }
}

// End one session (this device)
export const logout = async (userId: string, sessionId: string): Promise<void> => {
    try {
        await revokeSession(userId, sessionId);
    } catch (error) {
        rethrowUnexpected(error, "log out");
    }
}

// End every session of the user (all devices)
export const logoutAll = async (userId: string): Promise<void> => {
    try {
        await revokeAllSessions(userId);
    } catch (error) {
        rethrowUnexpected(error, "log out of all sessions");
    }
}

// Get the currently authenticated user's details
export const me = async (userId: string): Promise<UserResponseDto> => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }
        return toUserResponseDto(user);
    } catch (error) {
        return rethrowUnexpected(error, "fetch user details");
    }
}