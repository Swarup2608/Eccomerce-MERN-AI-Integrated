import mongoose from "mongoose";

const PRODUCT_STATUSES = {
    DRAFT: "draft",
    ACTIVE: "active",
    ARCHIVED: "archived",
} as const;

export type PRODUCT_STATUS_VALUE = (typeof PRODUCT_STATUSES)[keyof typeof PRODUCT_STATUSES];

interface IProduct {
    name: string;
    slug: string;
    description?: string;

    brandId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;

    status: PRODUCT_STATUS_VALUE;

    images: string[];
    specifications: Map<string, string>;

    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    status: { type: String, enum: Object.values(PRODUCT_STATUSES), default: PRODUCT_STATUSES.DRAFT },
    images: [{ type: String, trim: true }],
    specifications: { type: Map, of: String, default: {} },
}, { timestamps: true });

ProductSchema.index({
    categoryId: 1,
    status: 1
});

ProductSchema.index({
    brandId: 1,
    status: 1
});

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
