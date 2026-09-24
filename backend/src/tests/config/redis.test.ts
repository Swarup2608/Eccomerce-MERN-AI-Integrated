import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import connectRedis, { redisClient, isRedisConnected } from "../../config/redis.js";

test("connects and logs a success message", async (t) => {
  const connectMock = t.mock.method(redisClient, "connect", async () => {});
  const logMock = t.mock.method(console, "log", () => {});

  await connectRedis();

  assert.equal(connectMock.mock.callCount(), 1);
  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "INFO");
  assert.equal(logged.message, "Redis connected successfully");
});

test("logs and rethrows the error when connecting fails", async (t) => {
  const error = new Error("ECONNREFUSED");
  t.mock.method(redisClient, "connect", async () => {
    throw error;
  });
  const logMock = t.mock.method(console, "log", () => {});

  await assert.rejects(connectRedis(), error);

  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "ERROR");
  assert.equal(logged.message, "Error connecting to Redis:");
  assert.equal(logged.error, "ECONNREFUSED");
});

test("logs but does not throw when the client emits a connection error", (t) => {
  const logMock = t.mock.method(console, "log", () => {});
  const error = new Error("connection lost");

  assert.doesNotThrow(() => redisClient.emit("error", error));

  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "ERROR");
  assert.equal(logged.message, "Redis connection error:");
  assert.equal(logged.error, "connection lost");
});

test("isRedisConnected reflects the client status", () => {
  const originalStatus = redisClient.status;

  redisClient.status = "ready";
  assert.equal(isRedisConnected(), true);

  redisClient.status = "connecting";
  assert.equal(isRedisConnected(), false);

  redisClient.status = originalStatus;
});
