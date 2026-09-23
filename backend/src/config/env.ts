import zod from "zod";

const envSchema = zod.object({
  PORT: zod.string().default("5000"),
  MONGO_URI: zod.string().min(1, "MONGO_URI is required"),
  REDIS_URL: zod.string().min(1, "REDIS_URL is required"),
});

const env = envSchema.parse(process.env);

export default env;