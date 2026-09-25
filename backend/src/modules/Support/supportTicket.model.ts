import mongoose from "mongoose";

const SUPPORT_TICKET_PRIORITIES = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
} as const;

const SUPPORT_TICKET_STATUSES = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    RESOLVED: "resolved",
    CLOSED: "closed",
} as const;

export type SUPPORT_TICKET_PRIORITY_VALUE = (typeof SUPPORT_TICKET_PRIORITIES)[keyof typeof SUPPORT_TICKET_PRIORITIES];

export type SUPPORT_TICKET_STATUS_VALUE = (typeof SUPPORT_TICKET_STATUSES)[keyof typeof SUPPORT_TICKET_STATUSES];

interface ISupportTicket {
    userId: mongoose.Types.ObjectId;
    vendorId?: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;

    subject: string;
    description: string;

    priority: SUPPORT_TICKET_PRIORITY_VALUE;

    status: SUPPORT_TICKET_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new mongoose.Schema<ISupportTicket>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: Object.values(SUPPORT_TICKET_PRIORITIES), default: SUPPORT_TICKET_PRIORITIES.MEDIUM },
    status: { type: String, enum: Object.values(SUPPORT_TICKET_STATUSES), default: SUPPORT_TICKET_STATUSES.OPEN },
}, { timestamps: true });

SupportTicketSchema.index({
    userId: 1,
    createdAt: -1
});

SupportTicketSchema.index({
    status: 1,
    priority: 1,
    createdAt: -1
});

SupportTicketSchema.index(
    { vendorId: 1, status: 1 },
    { partialFilterExpression: { vendorId: { $exists: true } } }
);

export const SupportTicket = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
