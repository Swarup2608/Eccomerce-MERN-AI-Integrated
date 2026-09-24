import { Redis } from "ioredis";
import env from "./env.js";
import { logger } from "../utils/logger.js";

const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redisClient.on("error", (error: Error) => {
  logger.error("Redis connection error:", { error : error instanceof Error ? error.message : error });
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (error) {
    logger.error("Error connecting to Redis:", { error : error instanceof Error ? error.message : error });
    throw error;
  }
};

export const isRedisConnected = () => redisClient.status === "ready";

export { redisClient };
export default connectRedis;
