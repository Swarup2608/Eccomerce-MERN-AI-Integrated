import mongoose from "mongoose";

interface IProductVariant {
    productId: mongoose.Types.ObjectId;

    // e.g. { color: "Black", size: "XL" }
    attributes: Map<string, string>;

    // Derived from attributes, e.g. "color=black|size=xl"; "default" when there are none. Never set directly.
    variantKey: string;

    images: string[];

    createdAt: Date;
    updatedAt: Date;
}

export const buildVariantKey = (attributes: Map<string, string>): string =>
    [...attributes.entries()]
        .map(([name, value]) => [name.trim().toLowerCase(), value.trim().toLowerCase()])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`)
        .join("|");

// Key for a product's single attribute-less variant (simple products); the unique index allows only one
const DEFAULT_VARIANT_KEY = "default";

const ProductVariantSchema = new mongoose.Schema<IProductVariant>({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    attributes: { type: Map, of: String, default: {} },
    variantKey: { type: String, required: true, trim: true },
    images: [{ type: String, trim: true }],
}, { timestamps: true });

// Runs on save()/create(); updateOne/findOneAndUpdate bypass it, so change attributes via save()
ProductVariantSchema.pre("validate", function () {
    this.variantKey = buildVariantKey(this.attributes) || DEFAULT_VARIANT_KEY;
});

// A product can't have two variants with the same attribute combination
ProductVariantSchema.index(
    { productId: 1, variantKey: 1 },
    { unique: true }
);

export const ProductVariant = mongoose.model<IProductVariant>("ProductVariant", ProductVariantSchema);
