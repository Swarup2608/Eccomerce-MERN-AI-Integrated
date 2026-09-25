    import mongoose from "mongoose";

    const VENDOR_PRODUCT_VARIANT_STATUSES = {
        ACTIVE: "active",
        INACTIVE: "inactive",
    } as const;

    export type VENDOR_PRODUCT_VARIANT_STATUS_VALUE = (typeof VENDOR_PRODUCT_VARIANT_STATUSES)[keyof typeof VENDOR_PRODUCT_VARIANT_STATUSES];

    interface IVendorProductVariant {
        vendorProductId: mongoose.Types.ObjectId;
        productVariantId: mongoose.Types.ObjectId;

        price: number;
        compareAtPrice?: number;

        sku: string;

        status: VENDOR_PRODUCT_VARIANT_STATUS_VALUE;

        createdAt: Date;
        updatedAt: Date;
    }

    const VendorProductVariantSchema = new mongoose.Schema<IVendorProductVariant>({
        vendorProductId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProduct", required: true },
        productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
        price: { type: Number, required: true, min: 0 },
        compareAtPrice: { type: Number, min: 0 },
        sku: { type: String, required: true, uppercase: true, trim: true },
        status: { type: String, enum: Object.values(VENDOR_PRODUCT_VARIANT_STATUSES), default: VENDOR_PRODUCT_VARIANT_STATUSES.ACTIVE },
    }, { timestamps: true });

    // Runs on save()/create(); updateOne/findOneAndUpdate bypass it
    VendorProductVariantSchema.pre("validate", function () {
        if (this.compareAtPrice != null && this.compareAtPrice < this.price) {
            this.invalidate("compareAtPrice", "compareAtPrice must be greater than or equal to price");
        }
    });

    // A vendor listing offers a given variant only once
    VendorProductVariantSchema.index(
        { vendorProductId: 1, productVariantId: 1 },
        { unique: true }
    );

    VendorProductVariantSchema.index(
        { vendorProductId: 1, sku: 1 },
        { unique: true }
    );

    VendorProductVariantSchema.index({
        productVariantId: 1,
        status: 1
    });

    export const VendorProductVariant = mongoose.model<IVendorProductVariant>("VendorProductVariant", VendorProductVariantSchema);
