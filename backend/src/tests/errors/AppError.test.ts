import { test } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../errors/AppError.js";

test("AppError carries statusCode, code, message, and identifies itself as an Error", () => {
  const error = new AppError(404, "NOT_FOUND", "Widget not found");

  assert.equal(error.statusCode, 404);
  assert.equal(error.code, "NOT_FOUND");
  assert.equal(error.message, "Widget not found");
  assert.equal(error.name, "AppError");
  assert.ok(error instanceof Error);
});
