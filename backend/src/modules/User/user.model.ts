import { Schema, model } from "mongoose";

const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
  VENDOR: "vendor",
  SUPER_ADMIN: "super_admin",
} as const;

const USER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
  SUSPENDED: "suspended",
} as const;

export type USER_STATUS_VALUE = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export type USER_ROLE_VALUE = (typeof USER_ROLES)[keyof typeof USER_ROLES];

interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: USER_ROLE_VALUE;
  username: string;
  country: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date | null;
  status: USER_STATUS_VALUE;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    country: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(USER_STATUSES), default: USER_STATUSES.ACTIVE },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

export const User = model<IUser>("User", userSchema);
