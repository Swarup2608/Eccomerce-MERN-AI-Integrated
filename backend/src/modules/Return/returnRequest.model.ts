import mongoose from "mongoose";

const RETURN_REQUEST_STATUSES = {
    REQUESTED: "requested",
    APPROVED: "approved",
    REJECTED: "rejected",
    PICKUP_SCHEDULED: "pickup_scheduled",
    RECEIVED: "received",
    REFUNDED: "refunded",
    COMPLETED: "completed",
} as const;

export type RETURN_REQUEST_STATUS_VALUE = (typeof RETURN_REQUEST_STATUSES)[keyof typeof RETURN_REQUEST_STATUSES];

interface IReturnRequest {
    orderId: mongoose.Types.ObjectId;
    vendorOrderId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    reason: string;

    status: RETURN_REQUEST_STATUS_VALUE;

    // Sum of the ReturnItem refund amounts
    refundAmount: number;

    createdAt: Date;
    updatedAt: Date;
}

const ReturnRequestSchema = new mongoose.Schema<IReturnRequest>({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(RETURN_REQUEST_STATUSES), default: RETURN_REQUEST_STATUSES.REQUESTED },
    refundAmount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

ReturnRequestSchema.index({
    userId: 1,
    createdAt: -1
});

ReturnRequestSchema.index({
    vendorOrderId: 1,
    status: 1
});

ReturnRequestSchema.index({ orderId: 1 });

export const ReturnRequest = mongoose.model<IReturnRequest>("ReturnRequest", ReturnRequestSchema);
