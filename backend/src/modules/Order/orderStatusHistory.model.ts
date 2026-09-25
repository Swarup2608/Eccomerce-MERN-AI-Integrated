import mongoose from "mongoose";
import { ORDER_STATUSES, type ORDER_STATUS_VALUE } from "./order.model.js";
import { VENDOR_ORDER_STATUSES, type VENDOR_ORDER_STATUS_VALUE } from "./vendorOrder.model.js";

const ORDER_STATUS_VALUES: readonly string[] = Object.values(ORDER_STATUSES);
const VENDOR_ORDER_STATUS_VALUES: readonly string[] = Object.values(VENDOR_ORDER_STATUSES);

interface IOrderStatusHistory {
    orderId: mongoose.Types.ObjectId;
    // Set when the change is to a vendor order rather than the whole order
    vendorOrderId?: mongoose.Types.ObjectId;

    // VENDOR_ORDER_STATUS_VALUE when vendorOrderId is set, otherwise ORDER_STATUS_VALUE
    status: ORDER_STATUS_VALUE | VENDOR_ORDER_STATUS_VALUE;

    note?: string;

    // Empty for system changes
    changedBy?: mongoose.Types.ObjectId;

    createdAt: Date;
}

const OrderStatusHistorySchema = new mongoose.Schema<IOrderStatusHistory>({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder" },
    status: {
        type: String,
        required: true,
        enum: [...new Set([...ORDER_STATUS_VALUES, ...VENDOR_ORDER_STATUS_VALUES])],
    },
    note: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: { createdAt: true, updatedAt: false } });

OrderStatusHistorySchema.pre("validate", function () {
    const allowed = this.vendorOrderId ? VENDOR_ORDER_STATUS_VALUES : ORDER_STATUS_VALUES;
    if (!allowed.includes(this.status)) {
        this.invalidate("status", `"${this.status}" is not a valid ${this.vendorOrderId ? "vendor order" : "order"} status`);
    }
});

OrderStatusHistorySchema.index({
    orderId: 1,
    createdAt: 1
});

OrderStatusHistorySchema.index(
    { vendorOrderId: 1, createdAt: 1 },
    { partialFilterExpression: { vendorOrderId: { $exists: true } } }
);

export const OrderStatusHistory = mongoose.model<IOrderStatusHistory>("OrderStatusHistory", OrderStatusHistorySchema);
