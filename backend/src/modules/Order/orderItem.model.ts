import mongoose from "mongoose";

const ORDER_ITEM_STATUSES = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    RETURNED: "returned",
} as const;

export type ORDER_ITEM_STATUS_VALUE = (typeof ORDER_ITEM_STATUSES)[keyof typeof ORDER_ITEM_STATUSES];

interface IOrderItem {
    orderId: mongoose.Types.ObjectId;

    vendorId: mongoose.Types.ObjectId;

    productId: mongoose.Types.ObjectId;
    productVariantId: mongoose.Types.ObjectId;
    // The exact seller listing that was purchased
    vendorProductVariantId: mongoose.Types.ObjectId;

    // Snapshots at checkout
    productName: string;
    sku: string;

    quantity: number;

    unitPrice: number;
    discount: number;
    tax: number;

    // unitPrice * quantity - discount + tax
    total: number;

    status: ORDER_ITEM_STATUS_VALUE;

    createdAt: Date;
}

const OrderItemSchema = new mongoose.Schema<IOrderItem>({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    vendorProductVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProductVariant", required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ORDER_ITEM_STATUSES), default: ORDER_ITEM_STATUSES.PENDING },
}, { timestamps: { createdAt: true, updatedAt: false } });

OrderItemSchema.pre("validate", function () {
    const lineAmount = this.unitPrice * this.quantity;
    if (this.discount > lineAmount) {
        this.invalidate("discount", "discount cannot exceed unitPrice * quantity");
    }
    if (Math.round(this.total * 100) !== Math.round((lineAmount - this.discount + this.tax) * 100)) {
        this.invalidate("total", "total must equal unitPrice * quantity - discount + tax");
    }
});

OrderItemSchema.index({
    orderId: 1,
    vendorId: 1
});

export const OrderItem = mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);
