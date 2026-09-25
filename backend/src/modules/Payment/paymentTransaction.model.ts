import mongoose from "mongoose";

const PAYMENT_TRANSACTION_TYPES = {
    PAYMENT: "payment",
    REFUND: "refund",
    PARTIAL_REFUND: "partial_refund",
} as const;

const PAYMENT_TRANSACTION_STATUSES = {
    PENDING: "pending",
    SUCCESS: "success",
    FAILED: "failed",
} as const;

export type PAYMENT_TRANSACTION_TYPE_VALUE = (typeof PAYMENT_TRANSACTION_TYPES)[keyof typeof PAYMENT_TRANSACTION_TYPES];

export type PAYMENT_TRANSACTION_STATUS_VALUE = (typeof PAYMENT_TRANSACTION_STATUSES)[keyof typeof PAYMENT_TRANSACTION_STATUSES];

interface IPaymentTransaction {
    paymentId: mongoose.Types.ObjectId;

    transactionType: PAYMENT_TRANSACTION_TYPE_VALUE;

    providerTransactionId?: string;

    amount: number;
    currency: string;

    status: PAYMENT_TRANSACTION_STATUS_VALUE;

    // Raw provider response / webhook payload
    metadata?: Record<string, unknown>;

    createdAt: Date;
}

const PaymentTransactionSchema = new mongoose.Schema<IPaymentTransaction>({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    transactionType: { type: String, enum: Object.values(PAYMENT_TRANSACTION_TYPES), required: true },
    providerTransactionId: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR" },
    status: { type: String, enum: Object.values(PAYMENT_TRANSACTION_STATUSES), default: PAYMENT_TRANSACTION_STATUSES.PENDING },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

PaymentTransactionSchema.index({
    paymentId: 1,
    createdAt: -1
});

// Makes webhook processing idempotent
PaymentTransactionSchema.index(
    { providerTransactionId: 1 },
    { unique: true, partialFilterExpression: { providerTransactionId: { $type: "string" } } }
);

export const PaymentTransaction = mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);
