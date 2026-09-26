import type { Request, Response, NextFunction } from "express";
import { register } from "./auth.service.js";

// Express 4 does not forward async rejections, so pass errors to next() explicitly
const registerUserController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await register(req.body);

        res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export { registerUserController };