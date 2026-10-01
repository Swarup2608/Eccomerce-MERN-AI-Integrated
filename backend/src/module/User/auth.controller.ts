import type {Request, Response, NextFunction} from "express";
import { registerUser } from "./auth.service.js";
import { setAuthCookies } from "../../utils/token.js";


// Register user controller
export const RegisterUserController = async (req : Request, res: Response, next: NextFunction) => {
    try {
        const userData = req.body;
        // Call the service to register the user
        const newUser = await registerUser(userData);
        setAuthCookies(res, newUser.accessToken, newUser.refreshToken);
        res.status(201).json({
            success: true,
            data : {
                user: newUser.user,
            }
        });
    } catch (err) {
        next(err);
    }
}