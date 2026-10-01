import type { USER_ROLE_VALUE } from "../module/User/user.model.js";

declare global {
    namespace Express {
        interface AuthUser {
            id: string;
            role: USER_ROLE_VALUE;
            sessionId: string;
            emailVerified: boolean;
            phoneNumberVerified: boolean;
        }

        interface Request {
            requestId?: string;
            user?: AuthUser;
            // Set by verifyRefreshToken for the /refresh route
            refreshToken?: { userId: string; sessionId: string; jti: string };
        }
    }
}

export {};
