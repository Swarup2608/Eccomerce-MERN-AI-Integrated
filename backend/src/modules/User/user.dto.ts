import type { Types } from "mongoose";
import type { IUser } from "./user.model.js";

// Public shape of a user returned by the API; never includes passwordHash or internal fields
export interface UserResponseDto {
    id: string;
    email: string;
    username: string;
    phoneNumber: string;
}

type UserSource = Pick<IUser, "email" | "username" | "phoneNumber"> & { _id: Types.ObjectId };

export const toUserResponseDto = (user: UserSource): UserResponseDto => ({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
});
