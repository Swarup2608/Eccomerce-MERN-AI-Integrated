import mongoose from "mongoose";

const VENDOR_PRODUCT_STATUSES = {
    ACTIVE: "active",
    INACTIVE: "inactive",
} as const;

export type VENDOR_PRODUCT_STATUS_VALUE = (typeof VENDOR_PRODUCT_STATUSES)[keyof typeof VENDOR_PRODUCT_STATUSES];

// Seller SKUs live on VendorProductVariant; commission comes from CommissionRule
interface IVendorProduct {
    vendorId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;

    status: VENDOR_PRODUCT_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const VendorProductSchema = new mongoose.Schema<IVendorProduct>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    status: { type: String, enum: Object.values(VENDOR_PRODUCT_STATUSES), default: VENDOR_PRODUCT_STATUSES.ACTIVE },
}, { timestamps: true });

// A vendor lists a given product only once
VendorProductSchema.index(
    { vendorId: 1, productId: 1 },
    { unique: true }
);

VendorProductSchema.index({
    productId: 1,
    status: 1
});

export const VendorProduct = mongoose.model<IVendorProduct>("VendorProduct", VendorProductSchema);
