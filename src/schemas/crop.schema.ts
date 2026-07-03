import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CropSchedule } from "./crop.schedules.schema";

export type CropDocument = Crop & Document;

@Schema({ timestamps: true })
export class Crop {
        @Prop({ required: true, unique: true })
        name: string;

        @Prop()
        description: string;

        @Prop({ required: true })
        acreProfit: number;

        @Prop({ type: Object, default: [], required: false })
        schedules: CropSchedule;

        @Prop({ type: { id: Types.ObjectId, url: String }, required: true })
        image: {
                id: Types.ObjectId,
                url: String
        };

        @Prop({
                type: [
                        {
                                name: { type: String, required: true },
                                stage: { type: Number, required: true },
                                validFrom: Date,
                                validTo: Date,
                                soilElements: {
                                        N: Object,
                                        P: Object,
                                        K: Object,
                                        ph: Object,
                                        temperature: Object,
                                        humidity: Object,
                                        soilMoisture: Object,
                                },
                        },
                ],
                default: [],
        })
        thresholds: any[];
}

export const CropSchema = SchemaFactory.createForClass(Crop);
