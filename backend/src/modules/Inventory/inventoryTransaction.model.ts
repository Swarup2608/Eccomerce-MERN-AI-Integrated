import mongoose from "mongoose";

const INVENTORY_TRANSACTION_TYPES = {
    STOCK_IN: "stock_in",
    SALE: "sale",
    RESERVATION: "reservation",
    RELEASE: "release",
    RETURN: "return",
    ADJUSTMENT: "adjustment",
} as const;

const INVENTORY_REFERENCE_TYPES = {
    ORDER: "order",
    RETURN: "return",
    PURCHASE: "purchase",
    MANUAL: "manual",
} as const;

export type INVENTORY_TRANSACTION_TYPE_VALUE = (typeof INVENTORY_TRANSACTION_TYPES)[keyof typeof INVENTORY_TRANSACTION_TYPES];

export type INVENTORY_REFERENCE_TYPE_VALUE = (typeof INVENTORY_REFERENCE_TYPES)[keyof typeof INVENTORY_REFERENCE_TYPES];

const T = INVENTORY_TRANSACTION_TYPES;

// `quantity` is signed: STOCK_IN +n, SALE -n, RESERVATION -n (available), RELEASE +n (available),
// RETURN +n, ADJUSTMENT ±n. Required sign per type:
const QUANTITY_SIGN_RULES: Record<INVENTORY_TRANSACTION_TYPE_VALUE, { check: (quantity: number) => boolean; rule: string }> = {
    [T.STOCK_IN]: { check: (q) => q > 0, rule: "positive" },
    [T.SALE]: { check: (q) => q < 0, rule: "negative" },
    [T.RESERVATION]: { check: (q) => q < 0, rule: "negative" },
    [T.RELEASE]: { check: (q) => q > 0, rule: "positive" },
    [T.RETURN]: { check: (q) => q > 0, rule: "positive" },
    [T.ADJUSTMENT]: { check: (q) => q !== 0, rule: "non-zero" },
};

// Returns an error message, or null when `quantity` is valid for `type`
function getInventoryQuantityError(type: INVENTORY_TRANSACTION_TYPE_VALUE, quantity: number): string | null {
    if (!Number.isInteger(quantity)) return "quantity must be a whole number";
    const { check, rule } = QUANTITY_SIGN_RULES[type];
    return check(quantity) ? null : `quantity must be ${rule} for ${type} transactions`;
}

interface IInventoryTransaction {
    inventoryId: mongoose.Types.ObjectId;

    type: INVENTORY_TRANSACTION_TYPE_VALUE;

    quantity: number;

    referenceType: INVENTORY_REFERENCE_TYPE_VALUE;
    referenceId?: mongoose.Types.ObjectId;

    createdBy?: mongoose.Types.ObjectId;

    createdAt: Date;
}

const InventoryTransactionSchema = new mongoose.Schema<IInventoryTransaction>({
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    type: { type: String, enum: Object.values(INVENTORY_TRANSACTION_TYPES), required: true },
    quantity: { type: Number, required: true },
    referenceType: { type: String, enum: Object.values(INVENTORY_REFERENCE_TYPES), required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: { createdAt: true, updatedAt: false } });

InventoryTransactionSchema.pre("validate", function () {
    const error = getInventoryQuantityError(this.type, this.quantity);
    if (error) this.invalidate("quantity", error);
});

InventoryTransactionSchema.index({
    inventoryId: 1,
    createdAt: -1
});

InventoryTransactionSchema.index({
    referenceType: 1,
    referenceId: 1
});

export const InventoryTransaction = mongoose.model<IInventoryTransaction>("InventoryTransaction", InventoryTransactionSchema);
