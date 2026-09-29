import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

// Replaces req.body with the parsed result so handlers only ever see validated, stripped data
export const validate = (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (err) {
        next(err);
    }
};
