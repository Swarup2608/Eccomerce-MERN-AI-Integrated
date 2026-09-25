import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import mongoose from "mongoose";
import app from "../app.js";
import { redisClient } from "../config/redis.js";

let server: Server;
let baseUrl: string;

type StatusBody = {
  status: string;
  configs: { mongodb: string; redis: string };
};

before(() => {
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Expected server to listen on a network port");
      }
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });
});

after(() => {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Temporarily fakes the Mongo/Redis connection state for the duration of `run`
const withConnections = async (
  state: { mongo: boolean; redis: boolean },
  run: () => Promise<void>,
) => {
  const mongoConnection = mongoose.connection as unknown as { readyState: number };
  const originalReadyState = mongoConnection.readyState;
  const originalRedisStatus = redisClient.status;

  mongoConnection.readyState = state.mongo ? 1 : 0;
  redisClient.status = state.redis ? "ready" : "end";

  try {
    await run();
  } finally {
    mongoConnection.readyState = originalReadyState;
    redisClient.status = originalRedisStatus;
  }
};

test("GET /api/v1/health reports disconnected services with the expected shape", async () => {
  await withConnections({ mongo: false, redis: false }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type")?.includes("application/json"), true);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "ok");
    assert.equal(body.configs.mongodb, "disconnected");
    assert.equal(body.configs.redis, "disconnected");
  });
});

test("GET /api/v1/health reports connected services with the expected shape", async () => {
  await withConnections({ mongo: true, redis: true }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type")?.includes("application/json"), true);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "ok");
    assert.equal(body.configs.mongodb, "connected");
    assert.equal(body.configs.redis, "connected");
  });
});

test("GET /api/v1/ready returns 200 when Mongo and Redis are both connected", async () => {
  await withConnections({ mongo: true, redis: true }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    assert.equal(response.status, 200);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "ready");
    assert.equal(body.configs.mongodb, "connected");
    assert.equal(body.configs.redis, "connected");
  });
});

test("GET /api/v1/ready returns 503 when both dependencies are disconnected", async () => {
  await withConnections({ mongo: false, redis: false }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    assert.equal(response.status, 503);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "not_ready");
    assert.equal(body.configs.mongodb, "disconnected");
    assert.equal(body.configs.redis, "disconnected");
  });
});

test("GET /api/v1/ready returns 503 when only Mongo is connected", async () => {
  await withConnections({ mongo: true, redis: false }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    assert.equal(response.status, 503);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "not_ready");
    assert.equal(body.configs.mongodb, "connected");
    assert.equal(body.configs.redis, "disconnected");
  });
});

test("GET /api/v1/ready returns 503 when only Redis is connected", async () => {
  await withConnections({ mongo: false, redis: true }, async () => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    assert.equal(response.status, 503);

    const body = (await response.json()) as StatusBody;
    assert.equal(body.status, "not_ready");
    assert.equal(body.configs.mongodb, "disconnected");
    assert.equal(body.configs.redis, "connected");
  });
});
