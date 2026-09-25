import mongoose from "mongoose";

const BUSINESS_TYPES = {
    RETAIL: "retail",
    WHOLESALE: "wholesale",
    SERVICE: "service",
    OTHER: "other",
} as const;


const BUSINESS_CATEGORY = {
    INDIVIDUAL: "individual",
    COMPANY: "company",
    LLP: "llp",
    PARTNERSHIP: "partnership",
} as const;

const VENDOR_STATUSES = {
    PENDING: "pending",
    UNDER_REVIEW: "under_review",
    CLOSED: "closed",
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended",
} as const;

export type BUSINESS_TYPE_VALUE = (typeof BUSINESS_TYPES)[keyof typeof BUSINESS_TYPES];
export type BUSINESS_CATEGORY_VALUE = (typeof BUSINESS_CATEGORY)[keyof typeof BUSINESS_CATEGORY];
export type VENDOR_STATUS_VALUE = (typeof VENDOR_STATUSES)[keyof typeof VENDOR_STATUSES];

interface IVendor {
    ownerUserId: mongoose.Types.ObjectId;
    businessName : string;
    businessEmail: string;
    businessPhoneNumber: string;
    description?: string;
    logo?: string;
    banner?: string;
    businessType: BUSINESS_TYPE_VALUE;
    businessCategory: BUSINESS_CATEGORY_VALUE;
    status: VENDOR_STATUS_VALUE;

    approvedAt?: Date;
    rejectedAt?: Date;
    rejectedReason?: string;

    createdAt: Date;
    updatedAt: Date;
}

const VendorSchema = new mongoose.Schema<IVendor>({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    businessEmail: { type: String, required: true , lowercase: true, trim: true },
    businessPhoneNumber: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    banner: { type: String, trim: true },
    businessType: { type: String, enum: Object.values(BUSINESS_TYPES), required: true },
    businessCategory: { type: String, enum: Object.values(BUSINESS_CATEGORY), required: true },
    status: { type: String, enum: Object.values(VENDOR_STATUSES), required: true, default: VENDOR_STATUSES.PENDING },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
}, { timestamps: true });

VendorSchema.index({ status: 1 });
VendorSchema.index({ businessName: 1 });

export const Vendor = mongoose.model<IVendor>("Vendor", VendorSchema);

