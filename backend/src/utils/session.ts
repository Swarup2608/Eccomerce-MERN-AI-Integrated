import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { redisClient } from "../config/redis.js";
import type { IUser } from "../module/User/user.model.js";
import { refreshTokenTtlSeconds, signAccessToken, signRefreshToken } from "./jwt.js";

// A session is one login on one device. It holds the jti of the only refresh token
// currently allowed for it, so every refresh token can be used exactly once.
const sessionKey = (sessionId: string) => `auth:session:${sessionId}`;
const userSessionsKey = (userId: string) => `auth:user:sessions:${userId}`;

// Two tabs (or a retried request) can send the same refresh token at the same moment. Within this
// window the loser is told the refresh already happened instead of being treated as token theft.
const ROTATION_GRACE_MS = 10 * 1000;

export const ROTATE_RESULT = {
    ROTATED: 1,
    REUSED: 0,
    NOT_FOUND: -1,
    ALREADY_ROTATED: 2,
} as const;

type RotateResult = (typeof ROTATE_RESULT)[keyof typeof ROTATE_RESULT];

// Atomic compare-and-swap so two concurrent refreshes can't both succeed with the same token.
// A token whose jti doesn't match was already rotated: outside the grace window it has been
// replayed, so the whole session is killed and both the attacker and the victim must log in again.
const ROTATE_SCRIPT = `
local session = redis.call('HMGET', KEYS[1], 'userId', 'jti', 'prevJti', 'rotatedAt')
if not session[1] then return -1 end
if session[1] == ARGV[1] and session[2] == ARGV[2] then
  redis.call('HSET', KEYS[1], 'jti', ARGV[3], 'prevJti', ARGV[2], 'rotatedAt', ARGV[6])
  redis.call('EXPIRE', KEYS[1], ARGV[4])
  redis.call('SADD', KEYS[2], ARGV[5])
  redis.call('EXPIRE', KEYS[2], ARGV[4])
  return 1
end
if session[1] == ARGV[1] and session[3] == ARGV[2] and session[4] and tonumber(ARGV[6]) - tonumber(session[4]) <= tonumber(ARGV[7]) then
  return 2
end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[5])
return 0
`;

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

// Starts a new session (one per login/device) and issues its first token pair
export const startSession = async (user: UserDoc) => {
    const userId = user._id.toString();
    const sessionId = randomUUID();
    const { token: refreshToken, jti } = signRefreshToken(userId, sessionId);
    const { token: accessToken } = signAccessToken(userId, sessionId, user.role);
    await createSession(userId, sessionId, jti);
    return { accessToken, refreshToken };
};

// Swaps the session's current refresh token for the next one and slides its expiry forward,
// so a session stays alive for as long as it keeps being used
export const rotateSession = async (userId: string, sessionId: string, currentJti: string, nextJti: string): Promise<RotateResult> => {
    const result = await redisClient.eval(
        ROTATE_SCRIPT,
        2,
        sessionKey(sessionId),
        userSessionsKey(userId),
        userId,
        currentJti,
        nextJti,
        refreshTokenTtlSeconds().toString(),
        sessionId,
        Date.now().toString(),
        ROTATION_GRACE_MS.toString(),
    );
    return result as RotateResult;
};

export const isSessionActive = async (userId: string, sessionId: string): Promise<boolean> => {
    const owner = await redisClient.hget(sessionKey(sessionId), "userId");
    return owner === userId;
};

export const revokeSession = async (userId: string, sessionId: string) => {
    await redisClient
        .multi()
        .del(sessionKey(sessionId))
        .srem(userSessionsKey(userId), sessionId)
        .exec();
};

export const revokeAllSessions = async (userId: string) => {
    const sessionIds = await redisClient.smembers(userSessionsKey(userId));
    const pipeline = redisClient.multi();
    for (const sessionId of sessionIds) {
        pipeline.del(sessionKey(sessionId));
    }
    pipeline.del(userSessionsKey(userId));
    await pipeline.exec();
};
