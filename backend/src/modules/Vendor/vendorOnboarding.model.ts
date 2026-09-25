import mongoose from "mongoose";

const VENDOR_ONBOARDING_STEPS = {
    BUSINESS_DETAILS: "business_details",
    DOCUMENTS: "documents",
    BANK_DETAILS: "bank_details",
    STORE_SETUP: "store_setup",
    REVIEW: "review",
} as const;

const VENDOR_ONBOARDING_STATUSES = {
    IN_PROGRESS: "in_progress",
    SUBMITTED: "submitted",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export type VENDOR_ONBOARDING_STEP_VALUE = (typeof VENDOR_ONBOARDING_STEPS)[keyof typeof VENDOR_ONBOARDING_STEPS];
export type VENDOR_ONBOARDING_STATUS_VALUE = (typeof VENDOR_ONBOARDING_STATUSES)[keyof typeof VENDOR_ONBOARDING_STATUSES];

interface IVendorOnboarding {
    vendorId: mongoose.Types.ObjectId;

    currentStep: VENDOR_ONBOARDING_STEP_VALUE;
    status: VENDOR_ONBOARDING_STATUS_VALUE;

    submittedAt?: Date;
    completedAt?: Date;

    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;

    rejectionReason?: string;

    createdAt: Date;
    updatedAt: Date;
}

const VendorOnboardingSchema = new mongoose.Schema<IVendorOnboarding>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, unique: true },
    currentStep: { type: String, enum: Object.values(VENDOR_ONBOARDING_STEPS), required: true, default: VENDOR_ONBOARDING_STEPS.BUSINESS_DETAILS },
    status: { type: String, enum: Object.values(VENDOR_ONBOARDING_STATUSES), required: true, default: VENDOR_ONBOARDING_STATUSES.IN_PROGRESS },
    submittedAt: { type: Date },
    completedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
}, { timestamps: true });

VendorOnboardingSchema.index({ status: 1 });

export const VendorOnboarding = mongoose.model<IVendorOnboarding>("VendorOnboarding", VendorOnboardingSchema);
