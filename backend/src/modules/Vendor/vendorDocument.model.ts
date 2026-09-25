import mongoose from "mongoose";

const VENDOR_DOCUMENT_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

const VENDOR_DOCUMENT_TYPES = {
    GST: "gst",
    PAN: "pan",
    BUSINESS_LICENSE: "business_license",
    ADDRESS_PROOF: "address_proof",
    ID_PROOF: "id_proof",
    BANK_PROOF: "bank_proof",
} as const;

export type VENDOR_DOCUMENT_TYPE_VALUE = (typeof VENDOR_DOCUMENT_TYPES)[keyof typeof VENDOR_DOCUMENT_TYPES];

export type VENDOR_DOCUMENT_STATUS_VALUE = (typeof VENDOR_DOCUMENT_STATUSES)[keyof typeof VENDOR_DOCUMENT_STATUSES];

interface IVendorDocument {
    vendorId: mongoose.Types.ObjectId;
    documentType: VENDOR_DOCUMENT_TYPE_VALUE;
    documentNumber?: string;
    documentUrl: string;
    status: VENDOR_DOCUMENT_STATUS_VALUE;
    rejectionReason?: string;

    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const VendorDocumentSchema = new mongoose.Schema<IVendorDocument>({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    documentType: { type: String, enum: Object.values(VENDOR_DOCUMENT_TYPES), required: true, trim: true },
    documentNumber: { type: String, trim: true },
    documentUrl: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(VENDOR_DOCUMENT_STATUSES), default: VENDOR_DOCUMENT_STATUSES.PENDING },
    rejectionReason: { type: String, trim: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
}, { timestamps: true });

VendorDocumentSchema.index({
    vendorId: 1,
    status: 1
});

// Not unique: re-uploads are kept as history; status marks the current valid document
VendorDocumentSchema.index({
    vendorId: 1,
    documentType: 1,
    createdAt: -1
});

export const VendorDocument = mongoose.model<IVendorDocument>("VendorDocument", VendorDocumentSchema);