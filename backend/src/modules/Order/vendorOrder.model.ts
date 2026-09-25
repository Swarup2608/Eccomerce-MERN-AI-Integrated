import mongoose from "mongoose";

export const VENDOR_ORDER_STATUSES = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    PROCESSING: "processing",
    READY_TO_SHIP: "ready_to_ship",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    RETURNED: "returned",
} as const;

export type VENDOR_ORDER_STATUS_VALUE = (typeof VENDOR_ORDER_STATUSES)[keyof typeof VENDOR_ORDER_STATUSES];

interface IVendorOrder {
    orderId: mongoose.Types.ObjectId;
    vendorId: mongoose.Types.ObjectId;

    orderNumber: string;

    currency: string;

    subtotal: number;
    discount: number;
    tax: number;
    shippingFee: number;
    // subtotal - discount + tax + shippingFee
    total: number;

    vendorCommission: number;
    // total - vendorCommission; refunds are settled later through VendorPayout
    vendorEarnings: number;

    status: VENDOR_ORDER_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const VendorOrderSchema = new mongoose.Schema<IVendorOrder>({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR" },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    vendorCommission: { type: Number, required: true, min: 0 },
    vendorEarnings: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(VENDOR_ORDER_STATUSES), default: VENDOR_ORDER_STATUSES.PENDING },
}, { timestamps: true });

VendorOrderSchema.pre("validate", function () {
    if (this.discount > this.subtotal) {
        this.invalidate("discount", "discount cannot exceed subtotal");
    }
    if (Math.round(this.total * 100) !== Math.round((this.subtotal - this.discount + this.tax + this.shippingFee) * 100)) {
        this.invalidate("total", "total must equal subtotal - discount + tax + shippingFee");
    }
    if (this.vendorCommission > this.total) {
        this.invalidate("vendorCommission", "vendorCommission cannot exceed total");
    }
    if (Math.round(this.vendorEarnings * 100) !== Math.round((this.total - this.vendorCommission) * 100)) {
        this.invalidate("vendorEarnings", "vendorEarnings must equal total - vendorCommission");
    }
});

// One vendor order per vendor per order
VendorOrderSchema.index(
    { orderId: 1, vendorId: 1 },
    { unique: true }
);

VendorOrderSchema.index({
    vendorId: 1,
    status: 1,
    createdAt: -1
});

export const VendorOrder = mongoose.model<IVendorOrder>("VendorOrder", VendorOrderSchema);
