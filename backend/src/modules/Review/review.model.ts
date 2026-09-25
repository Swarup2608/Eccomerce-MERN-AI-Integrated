import mongoose from "mongoose";

const REVIEW_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export type REVIEW_STATUS_VALUE = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];

interface IReview {
    userId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    vendorId: mongoose.Types.ObjectId;
    orderItemId: mongoose.Types.ObjectId;

    rating: number;
    title?: string;
    comment?: string;

    images: string[];

    status: REVIEW_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new mongoose.Schema<IReview>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    orderItemId: { type: mongoose.Schema.Types.ObjectId, ref: "OrderItem", required: true, unique: true },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: { validator: Number.isInteger, message: "rating must be a whole number" },
    },
    title: { type: String, trim: true },
    comment: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    status: { type: String, enum: Object.values(REVIEW_STATUSES), default: REVIEW_STATUSES.PENDING },
}, { timestamps: true });

ReviewSchema.index({
    productId: 1,
    status: 1,
    createdAt: -1
});

ReviewSchema.index({
    vendorId: 1,
    status: 1
});

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
