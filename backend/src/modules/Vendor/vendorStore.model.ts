import mongoose from "mongoose";

const VENDOR_STORE_STATUSES = {
    ACTIVE: "active",
    INACTIVE: "inactive",
} as const;

export type VENDOR_STORE_STATUS_VALUE = (typeof VENDOR_STORE_STATUSES)[keyof typeof VENDOR_STORE_STATUSES];

interface IVendorStore {
    vendorId: mongoose.Types.ObjectId;

    name: string;
    slug: string;
    description?: string;

    logo?: string;
    banner?: string;

    status: VENDOR_STORE_STATUS_VALUE;

    rating: number;
    reviewCount: number;

    createdAt: Date;
    updatedAt: Date;
}

const VendorStoreSchema = new mongoose.Schema<IVendorStore>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    banner: { type: String, trim: true },
    status: { type: String, enum: Object.values(VENDOR_STORE_STATUSES), required: true, default: VENDOR_STORE_STATUSES.ACTIVE },
    rating: { type: Number, required: true, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, required: true, default: 0, min: 0 },
}, { timestamps: true });

VendorStoreSchema.index({ status: 1 });

export const VendorStore = mongoose.model<IVendorStore>("VendorStore", VendorStoreSchema);
