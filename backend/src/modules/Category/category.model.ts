import mongoose from "mongoose";

const CATEGORY_STATUSES = {
    ACTIVE: "active",
    INACTIVE: "inactive",
} as const;

export type CATEGORY_STATUS_VALUE = (typeof CATEGORY_STATUSES)[keyof typeof CATEGORY_STATUSES];

interface ICategory {
    name: string;
    slug: string;
    description?: string;
    image?: string;

    parentCategoryId?: mongoose.Types.ObjectId | null;

    status: CATEGORY_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new mongoose.Schema<ICategory>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    status: { type: String, enum: Object.values(CATEGORY_STATUSES), default: CATEGORY_STATUSES.ACTIVE },
}, { timestamps: true });

CategorySchema.index({
    parentCategoryId: 1,
    status: 1
});

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
