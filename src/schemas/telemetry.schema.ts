import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TelemetryReadingDocument = TelemetryReading & Document;

@Schema({ timestamps: true })
export class TelemetryReading {
        @Prop({ type: Types.ObjectId, ref: 'Parcel', required: true })
        parcelId: Types.ObjectId;

        @Prop({ required: true })
        timestamp: Date;          // Top of the hour: 14:00:00

        @Prop()
        soilNitrogen: number;   

        @Prop()
        soilPhosphorus: number;

        @Prop()
        soilPotassium: number;

        @Prop({ min: 0, max: 14 })
        soilPh: number;

        @Prop()
        temperature: number;

        @Prop({ min: 0, max: 100 })
        humidity: number;

        @Prop()
        soilMoisture: number;

        @Prop({ required: true })
        source: string;

        @Prop({ type: Date, default: Date.now })
        createdAt: Date;
}

export const TelemetryReadingSchema = SchemaFactory.createForClass(TelemetryReading);

TelemetryReadingSchema.index({ parcelId: 1, timestamp: -1 });
TelemetryReadingSchema.index({ timestamp: 1 });
