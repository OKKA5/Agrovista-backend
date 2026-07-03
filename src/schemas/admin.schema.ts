import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { UserRole, UserStatus } from "./user.schema";

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true, collection: "admins" })
export class Admin {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    type: String,
    enum: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Prop({ default: false })
  tempPassword: boolean;

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

export const AdminSchema = SchemaFactory.createForClass(Admin);
