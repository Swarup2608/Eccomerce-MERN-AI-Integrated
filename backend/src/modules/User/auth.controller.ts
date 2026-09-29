import type { Request, Response, NextFunction } from "express";
import { login, logout, logoutAll, me, refresh, register } from "./auth.service.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../../utils/token.js";
import { verifyRefreshToken } from "../../utils/jwt.js";

// Tokens only travel in httpOnly cookies; they are never put in the response body where JS could read them

export const registerUserController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, tokens } = await register(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const loginUserController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, tokens } = await login(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// Runs after the verifyRefreshToken middleware, which sets req.refreshToken
export const refreshController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, sessionId, jti } = req.refreshToken!;
        const tokens = await refresh(userId, sessionId, jti);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json({ success: true });
    } catch (error) {
        clearAuthCookies(res);
        next(error);
    }
};

// Works even with an expired access token: the session is identified by the refresh cookie
export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken: unknown = req.cookies?.[REFRESH_COOKIE];
        if (typeof refreshToken === "string" && refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken);
                await logout(payload.sub, payload.sid);
            } catch {
                // An invalid or expired refresh token has no live session to revoke
            }
        }
        clearAuthCookies(res);
        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

export const logoutAllController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await logoutAll(req.user!.id);
        clearAuthCookies(res);
        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await me(req.user!.id);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

