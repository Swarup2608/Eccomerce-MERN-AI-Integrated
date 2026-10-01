import type {Request, Response, NextFunction} from "express";
import { getCurrentUser, loginUser, logoutAllSessions, logoutUser, refreshSession, registerUser } from "./auth.service.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../../utils/token.js";
import { verifyAccessToken, verifyRefreshToken } from "../../utils/jwt.js";
import { requestPhoneNumberVerification, resendEmailVerification, verifyEmail, verifyPhoneNumber } from "./verification.service.js";
import { AppError } from "../../errors/AppError.js";


// Register user controller: the response is identical for a new account and an already registered
// email or phone number, and never sets cookies. The user logs in after registering.
export const RegisterUserController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        await registerUser(req.body);
        res.status(201).json({
            success: true,
            data : {
                message: "Registration received. Check your email for the next step, then log in.",
            }
        });
    } catch (err) {
        next(err);
    }
}

// Verify email controller: public, the token from the emailed link is the only credential
export const VerifyEmailController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        const result = await verifyEmail(req.body.token);
        res.status(200).json({
            success: true,
            data : result,
        });
    } catch (err) {
        next(err);
    }
}

// Resend verification controller: must run after authenticate
export const ResendVerificationController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }
        const result = await resendEmailVerification(req.user.id);
        res.status(200).json({
            success: true,
            data : result,
        });
    } catch (err) {
        next(err);
    }
}

// Login controller
export const LoginController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        const result = await loginUser(req.body);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({
            success: true,
            data : {
                user: result.user,
            }
        });
    } catch (err) {
        next(err);
    }
}

// Refresh controller: must run after verifyRefreshToken
export const RefreshController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.refreshToken) {
            throw new AppError(401, "REFRESH_TOKEN_MISSING", "Please log in again");
        }
        const { userId, sessionId, jti, issuedAt } = req.refreshToken;
        const tokens = await refreshSession(userId, sessionId, jti, issuedAt);
        // null: a concurrent request already rotated this token and set the new cookies
        if (tokens) {
            setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        }
        res.status(200).json({
            success: true,
            data : {
                message: "Session refreshed",
            }
        });
    } catch (err) {
        // The session is gone for good on any 401 here, so stale cookies are dropped with it
        if (err instanceof AppError && err.statusCode === 401) {
            clearAuthCookies(res);
        }
        next(err);
    }
}

// Finds the session the request's cookies belong to. The refresh token is tried first because it
// outlives the access token: logout has to work after the access token has expired.
const readSessionFromCookies = (req: Request): { userId: string; sessionId: string } | undefined => {
    const readers = [
        [REFRESH_COOKIE, verifyRefreshToken],
        [ACCESS_COOKIE, verifyAccessToken],
    ] as const;
    for (const [cookie, verify] of readers) {
        const token: unknown = req.cookies?.[cookie];
        if (typeof token !== "string" || token.length === 0) {
            continue;
        }
        try {
            const payload = verify(token);
            return { userId: payload.sub, sessionId: payload.sid };
        } catch {
            // Expired or tampered: try the other cookie
        }
    }
    return undefined;
};

// Logout controller: always succeeds and always clears the cookies, even when the session is already gone
export const LogoutController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        const session = readSessionFromCookies(req);
        clearAuthCookies(res);
        if (session) {
            await logoutUser(session.userId, session.sessionId);
        }
        res.status(200).json({
            success: true,
            data : {
                message: "Logged out",
            }
        });
    } catch (err) {
        next(err);
    }
}

// Logout from all devices controller: must run after authenticate
export const LogoutAllController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }
        await logoutAllSessions(req.user.id);
        clearAuthCookies(res);
        res.status(200).json({
            success: true,
            data : {
                message: "Logged out of all sessions",
            }
        });
    } catch (err) {
        next(err);
    }
}

// Current user controller: must run after authenticate
export const MeController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }
        const user = await getCurrentUser(req.user.id);
        res.status(200).json({
            success: true,
            data : {
                user,
            }
        });
    } catch (err) {
        next(err);
    }
}

// Send phone verification code controller: must run after authenticate
export const SendPhoneVerificationController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }
        const result = await requestPhoneNumberVerification(req.user.id);
        res.status(200).json({
            success: true,
            data : result,
        });
    } catch (err) {
        next(err);
    }
}

// Verify phone controller: must run after authenticate, the code is only valid for the logged-in user
export const VerifyPhoneController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required");
        }
        const result = await verifyPhoneNumber(req.user.id, req.body.code);
        res.status(200).json({
            success: true,
            data : result,
        });
    } catch (err) {
        next(err);
    }
}
