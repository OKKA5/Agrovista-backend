import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ParcelDocument = Parcel & Document;

export enum ParcelManaged {
        SELF_MANAGED = "SELF_MANAGED",
        AGROVISTA_MANAGED = "AGROVISTA_MANAGED",
}

export enum ParcelStatus {
        PENDING = "PENDING",
        APPROVED = "APPROVED",
        REJECTED = "REJECTED",
}

@Schema({ timestamps: true })
export class Parcel {
        @Prop({ required: true })
        parcelName: string;

        @Prop({ required: true })
        locationId: string;

        @Prop({ required: true })
        size: number;

        @Prop({ type: String, enum: ParcelStatus, default: ParcelStatus.PENDING })
        status: ParcelStatus;

        @Prop({ type: String, enum: ParcelManaged, default: ParcelManaged.AGROVISTA_MANAGED })
        managedType: ParcelManaged;

        @Prop({
                type: {
                        cropId: { type: Types.ObjectId, ref: "Crop" },
                        cropName: String,
                        plantedOn: Date,
                },
                default: null,
        })
        currentCrop: {
                cropId: Types.ObjectId;
                cropName: string;
                plantedOn: Date;
        };

        @Prop({ type: Types.ObjectId, ref: "User", required: true })
        ownerId: Types.ObjectId;

        @Prop({ type: Types.ObjectId, ref: "User" })
        moderatorId: Types.ObjectId | null;

        @Prop({
                type: [
                        {
                                cropId: Types.ObjectId,
                                cropName: String,
                                plantedOn: Date,
                                harvestedOn: Date,
                        },
                ],
        })
        cropHistory: Array<{
                cropId: Types.ObjectId;
                cropName: string;
                plantedOn: Date;
                harvestedOn: Date | null;
        }>;

        @Prop({
                type: {
                        documentId: {
                                type: Types.ObjectId,
                                ref: "DocumentEntity",
                                required: true,
                        },
                        fileUrl: { type: String, required: true },
                },
                required: true,
        })
        contract: {
                documentId: Types.ObjectId;
                fileUrl: string;
        };
}

export const ParcelSchema = SchemaFactory.createForClass(Parcel);
