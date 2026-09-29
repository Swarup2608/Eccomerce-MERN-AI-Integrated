import type { CookieOptions, Response } from "express";
import env from "../config/env.js";
import { accessTokenTtlSeconds, refreshTokenTtlSeconds } from "./jwt.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
// The refresh token is only ever sent to the auth routes, never to the rest of the API
const REFRESH_COOKIE_PATH = "/api/v1/auth";

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "strict",
  domain: env.COOKIE_DOMAIN || undefined,
});

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: accessTokenTtlSeconds() * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshTokenTtlSeconds() * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: REFRESH_COOKIE_PATH });
}
