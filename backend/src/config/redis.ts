import { Redis } from "ioredis";
import env from "./env.js";

const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redisClient.on("error", (error: Error) => {
  console.error("Redis connection error:", error);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Error connecting to Redis:", error);
  }
};

export const isRedisConnected = () => redisClient.status === "ready";

export { redisClient };
export default connectRedis;
