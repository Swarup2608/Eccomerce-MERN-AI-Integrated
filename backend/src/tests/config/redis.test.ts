import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import connectRedis, { redisClient, isRedisConnected } from "../../config/redis.js";

test("connects and logs a success message", async (t) => {
  const connectMock = t.mock.method(redisClient, "connect", async () => {});
  const logMock = t.mock.method(console, "log", () => {});

  await connectRedis();

  assert.equal(connectMock.mock.callCount(), 1);
  assert.ok(logMock.mock.calls.some((call) => call.arguments[0] === "Redis connected successfully"));
});

test("logs and swallows the error instead of throwing when connecting fails", async (t) => {
  const error = new Error("ECONNREFUSED");
  t.mock.method(redisClient, "connect", async () => {
    throw error;
  });
  const errorMock = t.mock.method(console, "error", () => {});

  await assert.doesNotReject(connectRedis());

  assert.ok(errorMock.mock.calls.some((call) => call.arguments[0] === "Error connecting to Redis:" && call.arguments[1] === error));
});

test("isRedisConnected reflects the client status", () => {
  const originalStatus = redisClient.status;

  redisClient.status = "ready";
  assert.equal(isRedisConnected(), true);

  redisClient.status = "connecting";
  assert.equal(isRedisConnected(), false);

  redisClient.status = originalStatus;
});
