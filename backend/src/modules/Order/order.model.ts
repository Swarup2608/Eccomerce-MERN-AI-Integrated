import mongoose from "mongoose";

export const ORDER_STATUSES = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    PARTIALLY_CANCELLED: "partially_cancelled",
} as const;

const ORDER_PAYMENT_STATUSES = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
    PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type ORDER_STATUS_VALUE = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export type ORDER_PAYMENT_STATUS_VALUE = (typeof ORDER_PAYMENT_STATUSES)[keyof typeof ORDER_PAYMENT_STATUSES];

// Copy of the address at checkout, so later edits to UserAddress don't change past orders
interface IShippingAddressSnapshot {
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface IOrder {
    orderNumber: string;

    userId: mongoose.Types.ObjectId;

    currency: string;

    subtotal: number;
    discount: number;
    tax: number;
    shippingFee: number;
    // subtotal - discount + tax + shippingFee
    total: number;

    couponId?: mongoose.Types.ObjectId;

    status: ORDER_STATUS_VALUE;
    paymentStatus: ORDER_PAYMENT_STATUS_VALUE;

    shippingAddressSnapshot: IShippingAddressSnapshot;

    createdAt: Date;
    updatedAt: Date;
}

const ShippingAddressSnapshotSchema = new mongoose.Schema<IShippingAddressSnapshot>({
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
}, { _id: false });

const OrderSchema = new mongoose.Schema<IOrder>({
    orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR" },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    status: { type: String, enum: Object.values(ORDER_STATUSES), default: ORDER_STATUSES.PENDING },
    paymentStatus: { type: String, enum: Object.values(ORDER_PAYMENT_STATUSES), default: ORDER_PAYMENT_STATUSES.PENDING },
    shippingAddressSnapshot: { type: ShippingAddressSnapshotSchema, required: true },
}, { timestamps: true });

OrderSchema.pre("validate", function () {
    if (this.discount > this.subtotal) {
        this.invalidate("discount", "discount cannot exceed subtotal");
    }
    if (Math.round(this.total * 100) !== Math.round((this.subtotal - this.discount + this.tax + this.shippingFee) * 100)) {
        this.invalidate("total", "total must equal subtotal - discount + tax + shippingFee");
    }
});

OrderSchema.index({
    userId: 1,
    createdAt: -1
});

OrderSchema.index({
    status: 1,
    createdAt: -1
});

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
