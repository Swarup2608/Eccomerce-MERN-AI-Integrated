import app from "./app.js";
import { logger } from "./utils/logger.js";
import connectDb from "./config/mongoose.js";
import  connectRedis  from "./config/redis.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDb();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info("Server started", { port: PORT, });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error instanceof Error ? error.message : error, });
    process.exit(1);
  }
}

startServer();