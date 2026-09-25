import mongoose from "mongoose";

const NOTIFICATION_TYPES = {
    ORDER: "order",
    PAYMENT: "payment",
    SHIPPING: "shipping",
    PROMOTION: "promotion",
    VENDOR: "vendor",
} as const;

export type NOTIFICATION_TYPE_VALUE = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

interface INotification {
    userId: mongoose.Types.ObjectId;

    type: NOTIFICATION_TYPE_VALUE;

    title: string;
    message: string;

    // Model name of the linked record, e.g. "Order", "Shipment"
    referenceType?: string;
    referenceId?: mongoose.Types.ObjectId;

    isRead: boolean;

    createdAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    referenceType: { type: String, trim: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

NotificationSchema.index({
    userId: 1,
    isRead: 1,
    createdAt: -1
});

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
