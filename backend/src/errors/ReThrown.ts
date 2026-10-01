import { AppError } from "./AppError.js";
import { logger } from "../utils/logger.js";

export const rethrowError = (error: unknown, action: string) : never => {
    if (error instanceof AppError) {
        throw error;
    }
    logger.error(`Failed to ${action}`, {
        error: error instanceof Error ? error.message : error,
    });
    throw new AppError(500, "INTERNAL_SERVER_ERROR", `An unexpected error occurred while trying to ${action}`);
};