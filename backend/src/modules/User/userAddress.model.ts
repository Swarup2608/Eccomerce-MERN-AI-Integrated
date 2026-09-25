import mongoose from "mongoose";

const ADDRESS_TYPES = {
  HOME: "home",
  WORK: "work",
  OTHER: "other",
} as const;

export type ADDRESS_TYPE_VALUE =
  (typeof ADDRESS_TYPES)[keyof typeof ADDRESS_TYPES];

interface IUserAddress {
  userId: mongoose.Types.ObjectId;
  type: ADDRESS_TYPE_VALUE;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const UserAddressSchema = new mongoose.Schema<IUserAddress>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    type: { type: String, enum: Object.values(ADDRESS_TYPES), required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserAddressSchema.index({ userId: 1 });
// Only one default address per user
UserAddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

export const UserAddress = mongoose.model<IUserAddress>(
  "UserAddress",
  UserAddressSchema,
);
