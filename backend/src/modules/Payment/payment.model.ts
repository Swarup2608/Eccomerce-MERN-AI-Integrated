import mongoose from "mongoose";

const PAYMENT_PROVIDERS = {
    RAZORPAY: "razorpay",
    STRIPE: "stripe",
} as const;

const PAYMENT_METHODS = {
    UPI: "upi",
    CARD: "card",
    NET_BANKING: "net_banking",
    COD: "cod",
} as const;

const PAYMENT_STATUSES = {
    CREATED: "created",
    PENDING: "pending",
    SUCCESS: "success",
    FAILED: "failed",
    REFUNDED: "refunded",
    PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type PAYMENT_PROVIDER_VALUE = (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export type PAYMENT_METHOD_VALUE = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export type PAYMENT_STATUS_VALUE = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

interface IPayment {
    orderId: mongoose.Types.ObjectId;

    // Empty for COD
    provider?: PAYMENT_PROVIDER_VALUE;
    // Provider's id for this payment attempt (e.g. Razorpay order/payment id, Stripe PaymentIntent id).
    // Individual captures/refunds are tracked on PaymentTransaction.providerTransactionId
    providerPaymentId?: string;

    amount: number;
    currency: string;

    method: PAYMENT_METHOD_VALUE;

    status: PAYMENT_STATUS_VALUE;

    paidAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new mongoose.Schema<IPayment>({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    provider: { type: String, enum: Object.values(PAYMENT_PROVIDERS) },
    providerPaymentId: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR" },
    method: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUSES), default: PAYMENT_STATUSES.CREATED },
    paidAt: { type: Date },
}, { timestamps: true });

PaymentSchema.pre("validate", function () {
    if (this.method !== PAYMENT_METHODS.COD && !this.provider) {
        this.invalidate("provider", "provider is required for online payments");
    }
    if (this.method === PAYMENT_METHODS.COD && this.provider) {
        this.invalidate("provider", "COD payments cannot have a payment provider");
    }
});

// An order can have several payment attempts
PaymentSchema.index({ orderId: 1 });

PaymentSchema.index(
    { provider: 1, providerPaymentId: 1 },
    { unique: true, partialFilterExpression: { providerPaymentId: { $type: "string" } } }
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
