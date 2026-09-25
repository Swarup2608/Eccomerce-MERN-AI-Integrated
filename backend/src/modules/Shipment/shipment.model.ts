import mongoose from "mongoose";

const SHIPMENT_STATUSES = {
    LABEL_CREATED: "label_created",
    PICKED_UP: "picked_up",
    IN_TRANSIT: "in_transit",
    OUT_FOR_DELIVERY: "out_for_delivery",
    DELIVERED: "delivered",
} as const;

export type SHIPMENT_STATUS_VALUE = (typeof SHIPMENT_STATUSES)[keyof typeof SHIPMENT_STATUSES];

interface IShipment {
    vendorOrderId: mongoose.Types.ObjectId;

    carrier: string;
    trackingNumber?: string;

    status: SHIPMENT_STATUS_VALUE;

    estimatedDeliveryDate?: Date;

    shippedAt?: Date;
    deliveredAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const ShipmentSchema = new mongoose.Schema<IShipment>({
    vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder", required: true },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, trim: true },
    status: { type: String, enum: Object.values(SHIPMENT_STATUSES), default: SHIPMENT_STATUSES.LABEL_CREATED },
    estimatedDeliveryDate: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
}, { timestamps: true });

ShipmentSchema.index({ vendorOrderId: 1 });

// Carrier webhooks look shipments up by tracking number
ShipmentSchema.index(
    { carrier: 1, trackingNumber: 1 },
    { unique: true, partialFilterExpression: { trackingNumber: { $type: "string" } } }
);

export const Shipment = mongoose.model<IShipment>("Shipment", ShipmentSchema);
