import mongoose from "mongoose";

const CAMPAIGN_TYPES = {
    FESTIVAL: "festival",
    FLASH_SALE: "flash_sale",
    SEASONAL: "seasonal",
    CLEARANCE: "clearance",
} as const;

const CAMPAIGN_STATUSES = {
    DRAFT: "draft",
    SCHEDULED: "scheduled",
    ACTIVE: "active",
    ENDED: "ended",
} as const;

export type CAMPAIGN_TYPE_VALUE = (typeof CAMPAIGN_TYPES)[keyof typeof CAMPAIGN_TYPES];

export type CAMPAIGN_STATUS_VALUE = (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES];

interface ICampaign {
    name: string;
    slug: string;
    description?: string;

    type: CAMPAIGN_TYPE_VALUE;

    bannerImage?: string;

    startDate: Date;
    endDate: Date;

    status: CAMPAIGN_STATUS_VALUE;

    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new mongoose.Schema<ICampaign>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: Object.values(CAMPAIGN_TYPES), required: true },
    bannerImage: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(CAMPAIGN_STATUSES), default: CAMPAIGN_STATUSES.DRAFT },
}, { timestamps: true });

CampaignSchema.pre("validate", function () {
    if (this.endDate <= this.startDate) {
        this.invalidate("endDate", "endDate must be after startDate");
    }
});

CampaignSchema.index({
    status: 1,
    startDate: 1,
    endDate: 1
});

export const Campaign = mongoose.model<ICampaign>("Campaign", CampaignSchema);
