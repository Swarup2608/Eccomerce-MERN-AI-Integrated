import mongoose from "mongoose";

interface ICartItem {
    vendorProductVariantId: mongoose.Types.ObjectId;
    quantity: number;
    // Unit price captured when the item was added
    price: number;
}

interface ICart {
    userId: mongoose.Types.ObjectId;

    items: ICartItem[];

    couponId?: mongoose.Types.ObjectId;

    subtotal: number;
    discount: number;
    tax: number;
    shippingFee: number;
    total: number;

    createdAt: Date;
    updatedAt: Date;
}

const CartItemSchema = new mongoose.Schema<ICartItem>({
    vendorProductVariantId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProductVariant", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
}, { _id: false });

const CartSchema = new mongoose.Schema<ICart>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    subtotal: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

export const Cart = mongoose.model<ICart>("Cart", CartSchema);
