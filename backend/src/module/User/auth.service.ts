import { RegisterInput } from "./auth.validation.js";
import { User } from "./user.model.js";
import { hashPassword } from "../../utils/password.js";
import { toUserResponseDto } from "./auth.dto.js";
import {AppError} from "../../errors/AppError.js";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import { startSession } from "../../utils/session.js";
import { rethrowError } from "../../errors/ReThrown.js";




// Register a new user
// Read the input user and verify if existing user already exists in the database 
// If the user does not exist, hash the password and save the new user to the database
// Return the newly created user response and token and generate session
export const registerUser = async (userInput : RegisterInput) => {
    const hashedPassword = await hashPassword(userInput.password);
    try{
        const newUser = await User.create({
            ...userInput,
            passwordHash: hashedPassword
        });
        const {accessToken, refreshToken } = await startSession(newUser);
        return { user : toUserResponseDto(newUser), accessToken, refreshToken };

    } catch (error) {
        const mongoError = error as {
            code?: number;
            keyPattern?: Record<string, number>;
        };
        if((error as { code?: number }).code === 11000){
            logger.warn("Duplicate user registration", { keyPattern: mongoError.keyPattern});
            throw new AppError(409, "DUPLICATE_USER", "User already exists");
        } 
        if(error instanceof mongoose.Error.ValidationError) {
            logger.error("Validation error");
            throw new AppError(400, "VALIDATION_ERROR", "Invalid user input");
        }
        return rethrowError(error, "register user");
    }

};