import mongoose from "mongoose";
import { IUser } from "../module/User/user.model.js";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { redisClient } from "../config/redis.js";
import { USER_ROLE_VALUE } from "../module/User/user.model.js";
import { signAccessToken, signRefreshToken } from "./jwt.js";

export const accessTokenTtlSeconds = () => env.JWT_ACCESS_TTL_MINUTES * 60;
export const refreshTokenTtlSeconds = () => env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

const JWT_ISSUER = "eccomerce-ai-api";
const JWT_AUDIENCE = "ecommerce-ai-client";

const sessionKey = (sessionId: string) => `auth:session:${sessionId}`;
const userSessionsKey = (userId: string) => `auth:user:sessions:${userId}`;

type UserDoc = mongoose.HydratedDocument<IUser>;

const createSession = async (userId: string, sessionId: string, jti: string) => {
    const ttl = refreshTokenTtlSeconds();
    await redisClient
        .multi()
        .hset(sessionKey(sessionId), { userId, jti, createdAt: Date.now().toString() })
        .expire(sessionKey(sessionId), ttl)
        .sadd(userSessionsKey(userId), sessionId)
        .expire(userSessionsKey(userId), ttl)
        .exec();
}
export const startSession = async (user: UserDoc) => {
    const userId = user._id.toString();
    const sessionId = randomUUID();
    const { token: refreshToken, jti } = signRefreshToken(userId, sessionId);
    const { token: accessToken } = signAccessToken(userId, sessionId, user.role);
    await createSession(userId, sessionId, jti);
    return { accessToken, refreshToken };
};
export const isSessionActive = async (userId: string, sessionId: string): Promise<boolean> => {
    const exists = await redisClient.exists(sessionKey(sessionId));
    if (!exists) return false;
    const session = await redisClient.hgetall(sessionKey(sessionId));
    return session.userId === userId;
};