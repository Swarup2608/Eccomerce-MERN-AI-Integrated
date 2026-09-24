import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error, req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const isAppError = err instanceof AppError;

    const statusCode = isAppError ? err.statusCode : 500;
    const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
    const message  = isAppError ? err.message : 'Internal Server Error';


    logger.error("Request failed",{
        requestId : req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        error: err instanceof Error ? err.message : err,
    });

    res.status(statusCode).json({
        success:false,
        error:{
            code,
            message,
            requestId: req.requestId,
        }
    });
}