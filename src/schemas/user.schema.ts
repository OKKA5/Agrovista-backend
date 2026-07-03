import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  PENDING_FOR_VERIFICATION = "PENDING_FOR_VERIFICATION",
  SUSPENDED = "SUSPENDED",
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phoneNumber: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING_FOR_VERIFICATION,
  })
  status: UserStatus;

  @Prop({ default: false })
  IsVerified: boolean;

  @Prop({ required: false })
  verificationCode?: string;

  @Prop({ required: false })
  verificationCodeExpire?: number;

  @Prop({ required: true })
  locationId: string;

  @Prop({ default: false })
  isModerator: boolean;

  @Prop([
    {
      deviceId: String,
      fcmToken: String,
    },
  ])
  fcms: {
    deviceId: string;
    fcmToken: string;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
