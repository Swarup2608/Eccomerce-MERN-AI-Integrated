import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import mongoose from "mongoose";
import app from "../app.js";
import { redisClient } from "../config/redis.js";

let server: Server;
let baseUrl: string;

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

test("GET /api/health reports disconnected services with the expected shape", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);

  const body = (await response.json()) as {
    status: string;
    configs: { mongodb: string; redis: string };
  };
  assert.equal(body.status, "ok");
  assert.equal(body.configs.mongodb, "disconnected");
  assert.equal(body.configs.redis, "disconnected");
});

test("GET /api/health reports connected services with the expected shape", async () => {
  const mongoConnection = mongoose.connection as unknown as { readyState: number };
  const originalReadyState = mongoConnection.readyState;
  const originalRedisStatus = redisClient.status;

  mongoConnection.readyState = 1;
  redisClient.status = "ready";

  try {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type")?.includes("application/json"), true);

    const body = (await response.json()) as {
      status: string;
      configs: { mongodb: string; redis: string };
    };
    assert.equal(body.status, "ok");
    assert.equal(body.configs.mongodb, "connected");
    assert.equal(body.configs.redis, "connected");
  } finally {
    mongoConnection.readyState = originalReadyState;
    redisClient.status = originalRedisStatus;
  }
});
