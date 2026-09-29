import { randomUUID } from "node:crypto";
import { redisClient } from "../../config/redis.js";
import { refreshTokenTtlSeconds } from "../../utils/jwt.js";

// A session is one login on one device. It holds the jti of the only refresh token
// currently allowed for it, so every refresh token can be used exactly once.
const sessionKey = (sessionId: string) => `auth:session:${sessionId}`;
const userSessionsKey = (userId: string) => `auth:user-sessions:${userId}`;

export const ROTATE_RESULT = {
  ROTATED: 1,
  REUSED: 0,
  NOT_FOUND: -1,
} as const;

type RotateResult = (typeof ROTATE_RESULT)[keyof typeof ROTATE_RESULT];

// Atomic compare-and-swap so two concurrent refreshes can't both succeed with the same token.
// A token whose jti doesn't match was already rotated: it has been replayed, so the whole
// session is killed and both the attacker and the victim must log in again.
const ROTATE_SCRIPT = `
local userId = redis.call('HGET', KEYS[1], 'userId')
if not userId then return -1 end
if userId ~= ARGV[1] or redis.call('HGET', KEYS[1], 'jti') ~= ARGV[2] then
  redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[2], ARGV[5])
  return 0
end
redis.call('HSET', KEYS[1], 'jti', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[4])
return 1
`;

export const newSessionId = () => randomUUID();

export async function createSession(userId: string, sessionId: string, jti: string) {
  const ttl = refreshTokenTtlSeconds();
  await redisClient
    .multi()
    .hset(sessionKey(sessionId), { userId, jti, createdAt: Date.now().toString() })
    .expire(sessionKey(sessionId), ttl)
    .sadd(userSessionsKey(userId), sessionId)
    .expire(userSessionsKey(userId), ttl)
    .exec();
}

export async function rotateSession(
  userId: string,
  sessionId: string,
  currentJti: string,
  nextJti: string,
): Promise<RotateResult> {
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
  );
  return result as RotateResult;
}

export async function isSessionActive(userId: string, sessionId: string): Promise<boolean> {
  const owner = await redisClient.hget(sessionKey(sessionId), "userId");
  return owner === userId;
}

export async function revokeSession(userId: string, sessionId: string) {
  await redisClient
    .multi()
    .del(sessionKey(sessionId))
    .srem(userSessionsKey(userId), sessionId)
    .exec();
}

export async function revokeAllSessions(userId: string) {
  const sessionIds = await redisClient.smembers(userSessionsKey(userId));
  const pipeline = redisClient.multi();
  for (const sessionId of sessionIds) {
    pipeline.del(sessionKey(sessionId));
  }
  pipeline.del(userSessionsKey(userId));
  await pipeline.exec();
}
