import mongoose from "mongoose";

interface IProductAnswer {
    questionId: mongoose.Types.ObjectId;

    // The user who wrote the answer
    userId: mongoose.Types.ObjectId;
    // Set when the answer is from a seller of the product
    vendorId?: mongoose.Types.ObjectId;

    answer: string;

    createdAt: Date;
}

const ProductAnswerSchema = new mongoose.Schema<IProductAnswer>({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductQuestion", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    answer: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

ProductAnswerSchema.index({
    questionId: 1,
    createdAt: 1
});

export const ProductAnswer = mongoose.model<IProductAnswer>("ProductAnswer", ProductAnswerSchema);
