import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import { User, USER_STATUSES, type USER_ROLE_VALUE } from "../module/User/user.model.js";
import { isSessionActive } from "../utils/session.js";
import { verifyAccessToken, verifyRefreshToken as verifyRefreshJwt } from "../utils/jwt.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies } from "../utils/token.js";

const readCookie = (req: Request, name: string): string | undefined => {
    const value: unknown = req.cookies?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
};

// Verifies the access token cookie and loads the user it belongs to.
// A token alone is not trusted: its session must still exist (logout/reuse revokes it instantly)
// and the user must still be active, so suspensions and password changes apply immediately.
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const token = readCookie(req, ACCESS_COOKIE);
        if (!token) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (error) {
            // A distinct code tells the client to call /auth/refresh rather than send the user to login
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError(401, "ACCESS_TOKEN_EXPIRED", "Access token expired");
            }
            throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
        }

        if (!(await isSessionActive(payload.sub, payload.sid))) {
            throw new AppError(401, "SESSION_REVOKED", "Session is no longer valid");
        }

        const user = await User.findById(payload.sub).select("role status passwordChangedAt emailVerified phoneNumberVerified").lean();
        if (!user || user.status !== USER_STATUSES.ACTIVE) {
            throw new AppError(401, "SESSION_REVOKED", "Session is no longer valid");
        }
        // Tokens issued before the last password change are dead, even if their session somehow survived
        if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > payload.iat) {
            throw new AppError(401, "SESSION_REVOKED", "Session is no longer valid");
        }

        // Role comes from the database, not the token, so a demotion takes effect on the next request
        req.user = { id: payload.sub, role: user.role, sessionId: payload.sid, emailVerified: user.emailVerified, phoneNumberVerified: user.phoneNumberVerified };
        next();
    } catch (error) {
        next(error);
    }
};

// Must run after authenticate
export const requireRoles = (...roles: USER_ROLE_VALUE[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
        return next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action"));
    }
    next();
};

// Verifies the refresh token cookie's signature and claims. Whether it is still the current
// token of a live session is checked atomically when it is rotated in the refresh service.
export const verifyRefreshToken = (req: Request, res: Response, next: NextFunction) => {
    const token = readCookie(req, REFRESH_COOKIE);
    if (!token) {
        return next(new AppError(401, "REFRESH_TOKEN_MISSING", "Please log in again"));
    }
    try {
        const payload = verifyRefreshJwt(token);
        req.refreshToken = { userId: payload.sub, sessionId: payload.sid, jti: payload.jti, issuedAt: payload.iat };
        next();
    } catch {
        clearAuthCookies(res);
        next(new AppError(401, "INVALID_REFRESH_TOKEN", "Please log in again"));
    }
};
