import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AlertDocument = Alert & Document;

export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export enum AlertStatus {
  ACTIVE = "active",
  ACKNOWLEDGE = "acknowledge",
  RESOLVED = "resolved",
}

@Schema({ timestamps: true })
export class Alert {
  @Prop({ type: Types.ObjectId, ref: "Parcel", required: true })
  parcelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "TelemetryReading" })
  telemetryReadingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Crop", required: true })
  cropId: Types.ObjectId;

  @Prop({ required: true })
  element: string;

  @Prop({
    required: true,
    type: { min: Number, max: Number, optimalMin: Number, optimalMax: Number },
  })
  thresholdValue: {
    min: number;
    max: number;
    optimalMin: number;
    optimalMax: number;
  };

  @Prop({ required: true })
  actualValue: number;

  @Prop({ required: true, enum: AlertSeverity })
  severity: AlertSeverity;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Prop({ type: [String], default: [] })
  notifiedVia: string[];

  @Prop()
  acknowledgedAt: Date;

  @Prop()
  resolvedAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ parcelId: 1, status: 1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ status: 1 });
