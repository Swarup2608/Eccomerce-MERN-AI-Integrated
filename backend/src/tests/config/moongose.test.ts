import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import connectDb from "../../config/mongoose.js";

test("connects to MongoDB and logs a success message", async (t) => {
  const connectMock = t.mock.method(mongoose, "connect", async () => mongoose);
  const logMock = t.mock.method(console, "log", () => {});

  await connectDb();

  assert.equal(connectMock.mock.callCount(), 1);
  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "INFO");
  assert.equal(logged.message, "MongoDB connected successfully");
});

test("logs and rethrows the error when the connection fails", async (t) => {
  const error = new Error("connection refused");
  t.mock.method(mongoose, "connect", async () => {
    throw error;
  });
  const logMock = t.mock.method(console, "log", () => {});

  await assert.rejects(connectDb(), error);

  const logged = JSON.parse(logMock.mock.calls[0].arguments[0] as string);
  assert.equal(logged.level, "ERROR");
  assert.equal(logged.message, "Error connecting to MongoDB:");
  assert.equal(logged.error, "connection refused");
});
