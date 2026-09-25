import mongoose from "mongoose";

interface ICouponUsage {
    couponId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;

    discountAmount: number;

    usedAt: Date;
}

const CouponUsageSchema = new mongoose.Schema<ICouponUsage>({
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: Date.now },
});

// Counting a user's uses for perUserLimit
CouponUsageSchema.index({
    couponId: 1,
    userId: 1
});

// A coupon is applied to an order only once
CouponUsageSchema.index(
    { couponId: 1, orderId: 1 },
    { unique: true }
);

export const CouponUsage = mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);
