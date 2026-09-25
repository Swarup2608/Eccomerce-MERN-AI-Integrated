import mongoose from "mongoose";

const COMMISSION_TYPES = {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
} as const;

export type COMMISSION_TYPE_VALUE = (typeof COMMISSION_TYPES)[keyof typeof COMMISSION_TYPES];

interface ICommissionRule {
    // Both empty = global rule; vendorId and/or categoryId narrow it
    vendorId?: mongoose.Types.ObjectId | null;
    categoryId?: mongoose.Types.ObjectId | null;

    type: COMMISSION_TYPE_VALUE;
    value: number;

    effectiveFrom: Date;
    effectiveTo?: Date;

    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const CommissionRuleSchema = new mongoose.Schema<ICommissionRule>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    type: { type: String, enum: Object.values(COMMISSION_TYPES), required: true },
    value: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

CommissionRuleSchema.pre("validate", function () {
    if (this.type === COMMISSION_TYPES.PERCENTAGE && (this.value <= 0 || this.value > 100)) {
        this.invalidate("value", "percentage commission must be greater than 0 and at most 100");
    }
    if (this.effectiveTo && this.effectiveTo <= this.effectiveFrom) {
        this.invalidate("effectiveTo", "effectiveTo must be after effectiveFrom");
    }
});

CommissionRuleSchema.index({
    vendorId: 1,
    categoryId: 1,
    isActive: 1,
    effectiveFrom: -1
});

export const CommissionRule = mongoose.model<ICommissionRule>("CommissionRule", CommissionRuleSchema);
