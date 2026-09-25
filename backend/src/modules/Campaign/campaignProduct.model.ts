import mongoose from "mongoose";

const CAMPAIGN_DISCOUNT_TYPES = {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
} as const;

export type CAMPAIGN_DISCOUNT_TYPE_VALUE = (typeof CAMPAIGN_DISCOUNT_TYPES)[keyof typeof CAMPAIGN_DISCOUNT_TYPES];

interface ICampaignProduct {
    campaignId: mongoose.Types.ObjectId;

    vendorProductId: mongoose.Types.ObjectId;
    // Empty = applies to every variant of the listing
    vendorProductVariantId?: mongoose.Types.ObjectId | null;

    discountType: CAMPAIGN_DISCOUNT_TYPE_VALUE;
    discountValue: number;

    salePrice?: number;

    createdAt: Date;
    updatedAt: Date;
}

const CampaignProductSchema = new mongoose.Schema<ICampaignProduct>({
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    vendorProductId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProduct", required: true },
    vendorProductVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProductVariant", default: null },
    discountType: { type: String, enum: Object.values(CAMPAIGN_DISCOUNT_TYPES), required: true },
    discountValue: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
}, { timestamps: true });

CampaignProductSchema.pre("validate", function () {
    if (this.discountType === CAMPAIGN_DISCOUNT_TYPES.PERCENTAGE && this.discountValue > 100) {
        this.invalidate("discountValue", "percentage discount cannot exceed 100");
    }
});

// A listing/variant appears in a campaign only once
CampaignProductSchema.index(
    { campaignId: 1, vendorProductId: 1, vendorProductVariantId: 1 },
    { unique: true }
);

CampaignProductSchema.index({ vendorProductVariantId: 1 });

export const CampaignProduct = mongoose.model<ICampaignProduct>("CampaignProduct", CampaignProductSchema);
