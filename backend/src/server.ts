import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import connectDb from "./config/moongose.js";
import connectRedis, { isRedisConnected } from "./config/redis.js";
import env from "./config/env.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  const redisConnected = isRedisConnected();

  res.json({
    status: "ok",
    configs :{
      mongodb: mongoConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected",
    }
  });
});


const PORT = parseInt(env.PORT, 10);

const startServer = async () => {
  await connectDb();
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
};

startServer();