import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { envSchema } from "../../config/env.js";

const REQUIRED_VARS = {
  MONGO_URI: "mongodb://localhost:27017/test",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  FRONTEND_URL: "http://localhost:3000",
  ADMIN_URL: "http://localhost:3001",
};

test("parses a fully-populated env", () => {
  const result = envSchema.parse({ ...REQUIRED_VARS, PORT: "4000" });

  assert.equal(result.PORT, "4000");
  assert.equal(result.MONGO_URI, REQUIRED_VARS.MONGO_URI);
  assert.equal(result.REDIS_URL, REQUIRED_VARS.REDIS_URL);
});

test("defaults PORT to 5000 when omitted", () => {
  const result = envSchema.parse({ ...REQUIRED_VARS });

  assert.equal(result.PORT, "5000");
});

test("throws when MONGO_URI is missing", () => {
  const input: Record<string, string> = { ...REQUIRED_VARS };
  delete input.MONGO_URI;

  assert.throws(() => envSchema.parse(input));
});

test("throws when REDIS_URL is missing", () => {
  const input: Record<string, string> = { ...REQUIRED_VARS };
  delete input.REDIS_URL;

  assert.throws(() => envSchema.parse(input));
});

test("throws when MONGO_URI is an empty string", () => {
  assert.throws(() => envSchema.parse({ ...REQUIRED_VARS, MONGO_URI: "" }));
});

test("throws when REDIS_URL is an empty string", () => {
  assert.throws(() => envSchema.parse({ ...REQUIRED_VARS, REDIS_URL: "" }));
});

test("throws when a JWT secret is shorter than 32 characters", () => {
  assert.throws(() => envSchema.parse({ ...REQUIRED_VARS, JWT_SECRET: "short" }));
});

test("throws when JWT_SECRET and JWT_REFRESH_SECRET are the same", () => {
  assert.throws(() => envSchema.parse({ ...REQUIRED_VARS, JWT_REFRESH_SECRET: REQUIRED_VARS.JWT_SECRET }));
});

test("parses COOKIE_SECURE=false as false, not truthy", () => {
  assert.equal(envSchema.parse({ ...REQUIRED_VARS, COOKIE_SECURE: "false" }).COOKIE_SECURE, false);
});
