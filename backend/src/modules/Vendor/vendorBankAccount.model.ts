import mongoose from "mongoose";

const VENDOR_BANK_ACCOUNT_STATUSES = {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
} as const;

export type VENDOR_BANK_ACCOUNT_STATUS_VALUE = (typeof VENDOR_BANK_ACCOUNT_STATUSES)[keyof typeof VENDOR_BANK_ACCOUNT_STATUSES];

interface IVendorBankAccount {
    vendorId: mongoose.Types.ObjectId;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
    status: VENDOR_BANK_ACCOUNT_STATUS_VALUE;
    isDefault: boolean;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const VendorBankAccountSchema = new mongoose.Schema<IVendorBankAccount>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true, select: false },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, required: true, trim: true },
    branchName: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(VENDOR_BANK_ACCOUNT_STATUSES), default: VENDOR_BANK_ACCOUNT_STATUSES.PENDING },
    isDefault: { type: Boolean, required: true, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
}, { timestamps: true });

VendorBankAccountSchema.index({ vendorId: 1, accountNumber: 1 }, { unique: true });

// Only one default account per vendor; only a verified account may become default (service layer)
VendorBankAccountSchema.index(
    { vendorId: 1, isDefault: 1 },
    { unique: true, partialFilterExpression: { isDefault: true } }
);

export const VendorBankAccount = mongoose.model<IVendorBankAccount>("VendorBankAccount", VendorBankAccountSchema);
