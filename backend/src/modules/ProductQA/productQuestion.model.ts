import mongoose from "mongoose";

const PRODUCT_QUESTION_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export type PRODUCT_QUESTION_STATUS_VALUE = (typeof PRODUCT_QUESTION_STATUSES)[keyof typeof PRODUCT_QUESTION_STATUSES];

interface IProductQuestion {
    userId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;

    question: string;

    status: PRODUCT_QUESTION_STATUS_VALUE;

    createdAt: Date;
}

const ProductQuestionSchema = new mongoose.Schema<IProductQuestion>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    question: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(PRODUCT_QUESTION_STATUSES), default: PRODUCT_QUESTION_STATUSES.PENDING },
}, { timestamps: { createdAt: true, updatedAt: false } });

ProductQuestionSchema.index({
    productId: 1,
    status: 1,
    createdAt: -1
});

export const ProductQuestion = mongoose.model<IProductQuestion>("ProductQuestion", ProductQuestionSchema);
