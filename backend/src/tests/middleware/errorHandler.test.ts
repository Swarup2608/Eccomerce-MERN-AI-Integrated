import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middleware/errorHandler.js";
import { AppError } from "../../errors/AppError.js";

type RequestWithId = Request & { requestId?: string };

function createRequest(overrides: Partial<RequestWithId>): RequestWithId {
  return overrides as RequestWithId;
}

function createResponse() {
  const state: { statusCode?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
  };
  return { res: res as unknown as Response, state };
}

test("formats an AppError using its own statusCode, code, and message", (t) => {
  t.mock.method(console, "log", () => {});
  const { res, state } = createResponse();
  const req = createRequest({ requestId: "req-1", method: "GET", originalUrl: "/api/widgets/1" });
  const error = new AppError(404, "NOT_FOUND", "Widget not found");

  errorHandler(error, req, res, (() => {}) as NextFunction);

  assert.equal(state.statusCode, 404);
  assert.deepEqual(state.body, {
    success: false,
    error: { code: "NOT_FOUND", message: "Widget not found", requestId: "req-1" },
  });
});

test("maps a non-AppError to a generic 500 without leaking its internal message", (t) => {
  t.mock.method(console, "log", () => {});
  const { res, state } = createResponse();
  const req = createRequest({ requestId: "req-2", method: "POST", originalUrl: "/api/widgets" });
  const error = new Error('column "foo" does not exist');

  errorHandler(error, req, res, (() => {}) as NextFunction);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, {
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error", requestId: "req-2" },
  });
});

test("logs the failure as structured JSON with request id, method, path, and status", (t) => {
  const logMock = t.mock.method(console, "log", () => {});
  const { res } = createResponse();
  const req = createRequest({ requestId: "req-3", method: "DELETE", originalUrl: "/api/widgets/9" });
  const error = new AppError(403, "FORBIDDEN", "Not allowed");

  errorHandler(error, req, res, (() => {}) as NextFunction);

  assert.equal(logMock.mock.callCount(), 1);
  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "ERROR");
  assert.equal(logged.message, "Request failed");
  assert.equal(logged.requestId, "req-3");
  assert.equal(logged.method, "DELETE");
  assert.equal(logged.path, "/api/widgets/9");
  assert.equal(logged.statusCode, 403);
  assert.equal(logged.error, "Not allowed");
});

test("responds without a requestId field being undefined-but-present when none was set", (t) => {
  t.mock.method(console, "log", () => {});
  const { res, state } = createResponse();
  const req = createRequest({ method: "GET", originalUrl: "/api/widgets" });
  const error = new AppError(400, "BAD_REQUEST", "Invalid input");

  errorHandler(error, req, res, (() => {}) as NextFunction);

  assert.equal((state.body as { error: { requestId?: string } }).error.requestId, undefined);
});
