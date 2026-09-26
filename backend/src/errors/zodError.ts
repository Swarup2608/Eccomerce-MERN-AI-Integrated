import { ZodError } from 'zod';

export interface ValidationErrorDetail {
    field: string;
    message: string;
}

export function isZodError(err: unknown): err is ZodError {
    return err instanceof ZodError;
}

export function formatZodError(err: ZodError): ValidationErrorDetail[] {
    return err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
}
