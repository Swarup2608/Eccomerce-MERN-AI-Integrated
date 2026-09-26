import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { isRedisConnected } from "./config/redis.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { AppError } from "./errors/AppError.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(requestId);
app.use(cors());
app.use(express.json());

const getDependencyStatus = () => {
  const mongoConnected = mongoose.connection.readyState === 1;
  const redisConnected = isRedisConnected();

  return {
    ready: mongoConnected && redisConnected,
    configs: {
      mongodb: mongoConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected",
    },
  };
};

// Liveness: the process is up and serving requests, regardless of dependencies
app.get("/api/v1/health", (_req, res) => {
  const { configs } = getDependencyStatus();

  res.json({ status: "ok", configs });
});

// Readiness: only 200 when every dependency needed to serve traffic is connected
app.get("/api/v1/ready", (_req, res) => {
  const { ready, configs } = getDependencyStatus();

  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", configs });
});

app.use("/api/v1/auth",authRoutes);

app.use((req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
});

// Error handling middleware should be registered after all routes
app.use(errorHandler);

export default app;
