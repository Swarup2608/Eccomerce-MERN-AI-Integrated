import mongoose from "mongoose";

interface IAuditLog {
    // Empty for system actions
    actorId?: mongoose.Types.ObjectId;
    actorRole?: string;

    // e.g. "vendor.approve", "product.update"
    action: string;

    // Model name, e.g. "Vendor", "Product"
    entityType: string;
    entityId?: mongoose.Types.ObjectId;

    // Snapshots of the entity before/after the change
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;

    ipAddress?: string;
    userAgent?: string;

    createdAt: Date;
}

const AuditLogSchema = new mongoose.Schema<IAuditLog>({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({
    entityType: 1,
    entityId: 1,
    createdAt: -1
});

AuditLogSchema.index(
    { actorId: 1, createdAt: -1 },
    { partialFilterExpression: { actorId: { $exists: true } } }
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
