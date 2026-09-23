import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import connectDb from "../../config/moongose.js";

test("connects to MongoDB and logs a success message", async (t) => {
  const connectMock = t.mock.method(mongoose, "connect", async () => mongoose);
  const logMock = t.mock.method(console, "log", () => {});

  await connectDb();

  assert.equal(connectMock.mock.callCount(), 1);
  assert.ok(logMock.mock.calls.some((call) => call.arguments[0] === "MongoDB connected successfully"));
});

test("logs and swallows the error instead of throwing when the connection fails", async (t) => {
  const error = new Error("connection refused");
  t.mock.method(mongoose, "connect", async () => {
    throw error;
  });
  const errorMock = t.mock.method(console, "error", () => {});

  await assert.doesNotReject(connectDb());

  assert.ok(errorMock.mock.calls.some((call) => call.arguments[0] === "Error connecting to MongoDB:" && call.arguments[1] === error));
});
