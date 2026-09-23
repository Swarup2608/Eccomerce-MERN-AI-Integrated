import "dotenv/config";
import connectDb from "./config/moongose.js";
import connectRedis from "./config/redis.js";
import env from "./config/env.js";
import app from "./app.js";

const PORT = parseInt(env.PORT, 10);

const startServer = async () => {
  await connectDb();
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
};

startServer();
