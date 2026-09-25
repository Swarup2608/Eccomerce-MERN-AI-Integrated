import mongoose from "mongoose";

interface IWishlistItem {
    productId: mongoose.Types.ObjectId;
    addedAt: Date;
}

interface IWishlist {
    userId: mongoose.Types.ObjectId;

    items: IWishlistItem[];

    createdAt: Date;
    updatedAt: Date;
}

const WishlistItemSchema = new mongoose.Schema<IWishlistItem>({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: Date, default: Date.now },
}, { _id: false });

const WishlistSchema = new mongoose.Schema<IWishlist>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [WishlistItemSchema], default: [] },
}, { timestamps: true });

export const Wishlist = mongoose.model<IWishlist>("Wishlist", WishlistSchema);
