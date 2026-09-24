import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../app.js";

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

test("unknown routes are handled by the central error handler with a 404 AppError", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);

  const body = (await response.json()) as {
    success: boolean;
    error: { code: string; message: string; requestId?: string };
  };
  assert.equal(body.success, false);
  assert.equal(body.error.code, "NOT_FOUND");
  assert.ok(body.error.requestId);
  assert.equal(response.headers.get("x-request-id"), body.error.requestId);
});

test("echoes back a client-supplied x-request-id through the error response", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`, {
    headers: { "x-request-id": "client-fixed-id" },
  });

  assert.equal(response.headers.get("x-request-id"), "client-fixed-id");

  const body = (await response.json()) as { error: { requestId?: string } };
  assert.equal(body.error.requestId, "client-fixed-id");
});

test("generates a distinct request id per request when the client supplies none", async () => {
  const [first, second] = await Promise.all([
    fetch(`${baseUrl}/api/does-not-exist`),
    fetch(`${baseUrl}/api/does-not-exist`),
  ]);

  const firstId = first.headers.get("x-request-id");
  const secondId = second.headers.get("x-request-id");

  assert.ok(firstId);
  assert.ok(secondId);
  assert.notEqual(firstId, secondId);
});
