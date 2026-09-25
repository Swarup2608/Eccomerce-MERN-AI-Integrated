import mongoose from "mongoose";

interface IReturnItem {
    returnRequestId: mongoose.Types.ObjectId;

    orderItemId: mongoose.Types.ObjectId;

    quantity: number;

    reason?: string;

    // Condition of the item as received back, e.g. "unopened", "damaged"
    condition?: string;

    refundAmount: number;
}

const ReturnItemSchema = new mongoose.Schema<IReturnItem>({
    returnRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest", required: true },
    orderItemId: { type: mongoose.Schema.Types.ObjectId, ref: "OrderItem", required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true },
    condition: { type: String, trim: true },
    refundAmount: { type: Number, min: 0, default: 0 },
});

// An order item appears once per return request
ReturnItemSchema.index(
    { returnRequestId: 1, orderItemId: 1 },
    { unique: true }
);

ReturnItemSchema.index({ orderItemId: 1 });

export const ReturnItem = mongoose.model<IReturnItem>("ReturnItem", ReturnItemSchema);
