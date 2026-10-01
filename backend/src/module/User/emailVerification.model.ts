import mongoose from "mongoose";

export interface IEmailVerification {
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const emailVerificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true , index: true},
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

emailVerificationSchema.index({expiresAt: 1}, { expireAfterSeconds: 0 });

export const EmailVerification = mongoose.model<IEmailVerification>("EmailVerification", emailVerificationSchema);