import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { redisClient } from "../config/redis.js";

// Count and expiry are set in one step, so a crash between the two can never leave a counter
// that lives forever and locks a client out permanently
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}
`;

// Keeps rate limit counters in Redis so they survive a restart and are shared by every API instance.
// Redis is only contacted when a request arrives, so importing a limiter never opens a connection.
export class RedisRateLimitStore implements Store {
    // Counters live in Redis, not in this process: tells express-rate-limit not to warn about shared keys
    localKeys = false;
    prefix: string;
    private windowMs = 60 * 1000;

    // Each limiter needs its own name, otherwise different limiters would share one counter per client
    constructor(name: string) {
        this.prefix = `ratelimit:${name}:`;
    }

    init(options: Options) {
        this.windowMs = options.windowMs;
    }

    async increment(key: string): Promise<ClientRateLimitInfo> {
        const [totalHits, ttl] = (await redisClient.eval(INCREMENT_SCRIPT, 1, this.prefix + key, this.windowMs.toString())) as [number, number];
        return { totalHits, resetTime: new Date(Date.now() + ttl) };
    }

    async decrement(key: string) {
        await redisClient.decr(this.prefix + key);
    }

    async resetKey(key: string) {
        await redisClient.del(this.prefix + key);
    }
}
