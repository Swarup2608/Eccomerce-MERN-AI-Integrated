import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import { requestId } from "../../middleware/requestId.js";

type RequestWithId = Request & { requestId?: string };

function createRequest(incomingId?: string): RequestWithId {
  return { header: (name: string) => (name === "x-request-id" ? incomingId : undefined) } as unknown as RequestWithId;
}

function createResponse() {
  const headers: Record<string, string> = {};
  const res = { setHeader: (name: string, value: string) => { headers[name] = value; } };
  return { res: res as unknown as Response, headers };
}

test("uses the incoming x-request-id header when the client supplies one", () => {
  const req = createRequest("client-supplied-id");
  const { res, headers } = createResponse();
  let nextCalled = false;

  requestId(req, res, (() => { nextCalled = true; }) as NextFunction);

  assert.equal(req.requestId, "client-supplied-id");
  assert.equal(headers["x-request-id"], "client-supplied-id");
  assert.equal(nextCalled, true);
});

test("generates a request id when the client does not supply one", () => {
  const req = createRequest(undefined);
  const { res, headers } = createResponse();

  requestId(req, res, (() => {}) as NextFunction);

  assert.ok(req.requestId);
  assert.equal(headers["x-request-id"], req.requestId);
});

test("generates a distinct id per request", () => {
  const req1 = createRequest(undefined);
  const req2 = createRequest(undefined);

  requestId(req1, createResponse().res, (() => {}) as NextFunction);
  requestId(req2, createResponse().res, (() => {}) as NextFunction);

  assert.notEqual(req1.requestId, req2.requestId);
});
