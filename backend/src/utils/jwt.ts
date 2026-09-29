import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import env from "../config/env.js";
import type { USER_ROLE_VALUE } from "../modules/User/user.model.js";

const ISSUER = "ecommerce-api";
const AUDIENCE = "ecommerce-client";
// Pin the algorithm so a token can never pick its own (e.g. "none" or an RS/HS confusion)
const ALGORITHM = "HS256";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: USER_ROLE_VALUE;
  typ: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  typ: "refresh";
  iat: number;
  exp: number;
}

export const accessTokenTtlSeconds = () => env.JWT_ACCESS_TTL_MINUTES * 60;
export const refreshTokenTtlSeconds = () => env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

export function signAccessToken(userId: string, sessionId: string, role: USER_ROLE_VALUE): string {
  return jwt.sign({ sid: sessionId, role, typ: "access" }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: accessTokenTtlSeconds(),
  });
}

export function signRefreshToken(userId: string, sessionId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sid: sessionId, typ: "refresh" }, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    jwtid: jti,
    expiresIn: refreshTokenTtlSeconds(),
  });
  return { token, jti };
}

// Both verifiers throw on a bad signature, expiry, wrong issuer/audience or wrong token type
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload === "string" || payload.typ !== "access" || !payload.sub || !payload.sid) {
    throw new jwt.JsonWebTokenError("invalid access token");
  }
  return payload as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload === "string" || payload.typ !== "refresh" || !payload.sub || !payload.sid || !payload.jti) {
    throw new jwt.JsonWebTokenError("invalid refresh token");
  }
  return payload as RefreshTokenPayload;
}
