import mongoose from "mongoose";

interface IInventory {
    vendorProductVariantId: mongoose.Types.ObjectId;

    quantity: number;
    reservedQuantity: number;

    reorderLevel: number;

    // Optimistic locking: match on version and $inc it in every update
    version: number;

    updatedAt: Date;
}

const InventorySchema = new mongoose.Schema<IInventory>({
    vendorProductVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProductVariant", required: true, unique: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    version: { type: Number, default: 0 },
}, { timestamps: { createdAt: false, updatedAt: true }, versionKey: false });

InventorySchema.pre("validate", function () {
    if (this.reservedQuantity > this.quantity) {
        this.invalidate("reservedQuantity", "reservedQuantity cannot exceed quantity");
    }
});

export const Inventory = mongoose.model<IInventory>("Inventory", InventorySchema);
