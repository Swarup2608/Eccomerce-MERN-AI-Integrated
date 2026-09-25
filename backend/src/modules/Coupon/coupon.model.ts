import mongoose from "mongoose";

const DISCOUNT_TYPES = {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
} as const;

export type DISCOUNT_TYPE_VALUE = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];

interface ICoupon {
    code: string;
    description?: string;

    discountType: DISCOUNT_TYPE_VALUE;
    discountValue: number;
    // Cap for percentage discounts
    maxDiscount?: number;

    minOrderValue: number;

    // Empty = unlimited
    usageLimit?: number;
    usageCount: number;

    perUserLimit?: number;

    startDate: Date;
    endDate: Date;

    // Empty = platform-wide coupon
    vendorId?: mongoose.Types.ObjectId | null;
    campaignId?: mongoose.Types.ObjectId | null;

    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const CouponSchema = new mongoose.Schema<ICoupon>({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    discountType: { type: String, enum: Object.values(DISCOUNT_TYPES), required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderValue: { type: Number, min: 0, default: 0 },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, min: 0, default: 0 },
    perUserLimit: { type: Number, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

CouponSchema.pre("validate", function () {
    if (this.discountType === DISCOUNT_TYPES.PERCENTAGE && this.discountValue > 100) {
        this.invalidate("discountValue", "percentage discount cannot exceed 100");
    }
    if (this.endDate <= this.startDate) {
        this.invalidate("endDate", "endDate must be after startDate");
    }
});

CouponSchema.index({
    isActive: 1,
    startDate: 1,
    endDate: 1
});

CouponSchema.index({ vendorId: 1 });

CouponSchema.index({ campaignId: 1 });

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
