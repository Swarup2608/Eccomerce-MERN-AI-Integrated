import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { isRedisConnected } from "./config/redis.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  const redisConnected = isRedisConnected();

  res.json({
    status: "ok",
    configs: {
      mongodb: mongoConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected",
    },
  });
});

export default app;
