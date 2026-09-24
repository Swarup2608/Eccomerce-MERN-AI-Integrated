import mongoose from "mongoose";
import env from "./env.js";
import { logger } from "../utils/logger.js";

const connectDb = async () => {
    try {
        await mongoose.connect(env.MONGO_URI as string);
        logger.info("MongoDB connected successfully");
    } catch (error) {
        logger.error("Error connecting to MongoDB:", { error : error instanceof Error ? error.message : error });
        throw error;
    }
}

export default connectDb;