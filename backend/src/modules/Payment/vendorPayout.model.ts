import mongoose from "mongoose";

const VENDOR_PAYOUT_STATUSES = {
    PENDING: "pending",
    PROCESSING: "processing",
    PAID: "paid",
    FAILED: "failed",
} as const;

export type VENDOR_PAYOUT_STATUS_VALUE = (typeof VENDOR_PAYOUT_STATUSES)[keyof typeof VENDOR_PAYOUT_STATUSES];

interface IVendorPayout {
    vendorId: mongoose.Types.ObjectId;
    vendorOrderId: mongoose.Types.ObjectId;

    currency: string;

    grossAmount: number;
    commissionAmount: number;
    refundAmount: number;
    // grossAmount - commissionAmount - refundAmount
    netAmount: number;

    status: VENDOR_PAYOUT_STATUS_VALUE;

    // Bank/provider payout reference; unique so the same payout can't be recorded twice
    payoutReference?: string;

    // Set only once status is PAID
    paidAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const VendorPayoutSchema = new mongoose.Schema<IVendorPayout>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder", required: true, unique: true },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR" },
    grossAmount: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, min: 0, default: 0 },
    refundAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(VENDOR_PAYOUT_STATUSES), default: VENDOR_PAYOUT_STATUSES.PENDING },
    payoutReference: { type: String, trim: true },
    paidAt: { type: Date },
}, { timestamps: true });

VendorPayoutSchema.pre("validate", function () {
    const deductions = this.commissionAmount + this.refundAmount;
    if (deductions > this.grossAmount) {
        this.invalidate("grossAmount", "commissionAmount + refundAmount cannot exceed grossAmount");
    }
    if (Math.round(this.netAmount * 100) !== Math.round((this.grossAmount - deductions) * 100)) {
        this.invalidate("netAmount", "netAmount must equal grossAmount - commissionAmount - refundAmount");
    }
    if (this.status === VENDOR_PAYOUT_STATUSES.PAID && !this.paidAt) {
        this.invalidate("paidAt", "paidAt is required for paid payouts");
    }
    if (this.status !== VENDOR_PAYOUT_STATUSES.PAID && this.paidAt) {
        this.invalidate("paidAt", "paidAt can only be set on paid payouts");
    }
});

VendorPayoutSchema.index(
    { payoutReference: 1 },
    { unique: true, partialFilterExpression: { payoutReference: { $type: "string" } } }
);

VendorPayoutSchema.index({
    vendorId: 1,
    status: 1,
    createdAt: -1
});

export const VendorPayout = mongoose.model<IVendorPayout>("VendorPayout", VendorPayoutSchema);
