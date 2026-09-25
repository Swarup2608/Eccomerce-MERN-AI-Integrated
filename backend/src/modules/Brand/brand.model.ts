import mongoose from "mongoose";

const BRAND_STATUSES = {
    ACTIVE: "active",
    INACTIVE: "inactive",
} as const;

export type BRAND_STATUS_VALUE = (typeof BRAND_STATUSES)[keyof typeof BRAND_STATUSES];

interface IBrand {
    name: string;
    slug: string;
    description?: string;
    logo?: string;

    status: BRAND_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const BrandSchema = new mongoose.Schema<IBrand>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    status: { type: String, enum: Object.values(BRAND_STATUSES), default: BRAND_STATUSES.ACTIVE },
}, { timestamps: true });

BrandSchema.index({ status: 1 });

export const Brand = mongoose.model<IBrand>("Brand", BrandSchema);
