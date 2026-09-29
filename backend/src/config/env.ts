import "dotenv/config";
import zod from "zod";

// HS256 secrets shorter than 256 bits can be brute-forced offline from a single captured token
const jwtSecret = (name: string) =>
  zod.string().min(32, `${name} must be at least 32 characters`);

export const envSchema = zod
  .object({
    PORT: zod.string().default("5000"),
    MONGO_URI: zod.string().min(1, "MONGO_URI is required"),
    REDIS_URL: zod.string().min(1, "REDIS_URL is required"),
    COOKIE_SECURE: zod.stringbool().default(true),
    // Empty means host-only cookies, which is the safest default
    COOKIE_DOMAIN: zod.string().optional(),
    // Comma-separated list of frontend origins allowed to call the API with cookies
    CORS_ORIGINS: zod
      .string()
      .default("http://localhost:3000,http://localhost:3001")
      .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
    JWT_REFRESH_TTL_DAYS: zod.coerce.number().int().positive().default(7),
    JWT_ACCESS_TTL_MINUTES: zod.coerce.number().int().positive().default(15),
    NODE_ENV: zod.string().default("development"),
    JWT_SECRET: jwtSecret("JWT_SECRET"),
    JWT_REFRESH_SECRET: jwtSecret("JWT_REFRESH_SECRET"),
  })
  .refine((env) => env.JWT_SECRET !== env.JWT_REFRESH_SECRET, {
    message: "JWT_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  });

const env = envSchema.parse(process.env);

export default env;
