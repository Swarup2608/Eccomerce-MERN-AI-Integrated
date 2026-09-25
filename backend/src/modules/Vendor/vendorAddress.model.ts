import mongoose from "mongoose";

const VENDOR_ADDRESS_TYPES = {
    BUSINESS: "business",
    WAREHOUSE: "warehouse",
    RETURN: "return",
} as const;

export type VENDOR_ADDRESS_TYPE_VALUE = (typeof VENDOR_ADDRESS_TYPES)[keyof typeof VENDOR_ADDRESS_TYPES];

interface IVendorAddress {
    vendorId: mongoose.Types.ObjectId;
    type: VENDOR_ADDRESS_TYPE_VALUE;

    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;

    phone: string;
    isDefault: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const VendorAddressSchema = new mongoose.Schema<IVendorAddress>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    type: { type: String, enum: Object.values(VENDOR_ADDRESS_TYPES), required: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });

VendorAddressSchema.index({
    vendorId: 1,
    type: 1
});

// Only one default address per vendor per address type
VendorAddressSchema.index(
    { vendorId: 1, type: 1, isDefault: 1 },
    { unique: true, partialFilterExpression: { isDefault: true } }
);

export const VendorAddress = mongoose.model<IVendorAddress>("VendorAddress", VendorAddressSchema);
