import { AppError } from "../../errors/AppError.js";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import type { LoginInput, RegisterInput } from "./auth.validator.js";
import { User, USER_STATUSES } from "./user.model.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import  { USER_ROLES } from "./user.model.js";



// Register a new user
export const register = async(registerInput: RegisterInput) => {
    
    const email = registerInput.email.trim().toLowerCase();
    const username = registerInput.userName.trim();
    const phoneNumber = registerInput.phoneNumber.trim();
    const passwordHash = await hashPassword(registerInput.password);
    try{
        const newUser = new User({
            ...registerInput,
            email,
            username,
            phoneNumber,
            passwordHash,
            role: USER_ROLES.USER,
        });
        await newUser.save();
        return {
            id: newUser._id,
            email: newUser.email,
            username: newUser.username,
            phoneNumber: newUser.phoneNumber
        }
    } catch (error) {
        // Check the code directly: mongoose bundles its own mongodb driver, so instanceof is unreliable
        if ((error as { code?: number }).code === 11000) {
            throw new AppError(
                409,
                "USER_ALREADY_EXISTS",
                "A user with the provided details already exists",
            );
        }
        if (error instanceof mongoose.Error.ValidationError) {
            throw new AppError(400, "VALIDATION_ERROR", error.message);
        }
        logger.error("Failed to register user", {
            error: error instanceof Error ? error.message : error,
        });
        throw new AppError(
            500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred while registering the user",
        );
    }
}

// Login a user 
export const login = async (loginInput : LoginInput) => {
    const email = loginInput.email.trim().toLowerCase();
    const password = loginInput.password
    try{
        const user = await User.findOne({ $and: [{ email }, { role: USER_ROLES.USER }]});
        if (!user) {
            throw new AppError(404, "INVALID_CREDENTIALS", "Either the email or password is incorrect");
        }
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
        }
        if(user && user.status === USER_STATUSES.ACTIVE) {
            return {
                id: user._id,
                email: user.email,
                username: user.username,
                phoneNumber: user.phoneNumber
            };
        }
        if(user && user.status === USER_STATUSES.INACTIVE) {
            throw new AppError(403, "INACTIVE_USER", "The user account is not active");
        }
        if(user && user.status === USER_STATUSES.SUSPENDED) {
            throw new AppError(403, "SUSPENDED_USER", "The user account is suspended");
        }
        if(user && user.status === USER_STATUSES.DELETED) {
            throw new AppError(403, "DELETED_USER", "The user account has been deleted");
        }
    } catch (error) {
        // Handle unexpected errors
        logger.error("Failed to login user", {
            error: error instanceof Error ? error.message : error,
        });
        throw new AppError(
            500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred while logging in the user",
        );
    }
}