import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

export enum Platform {
        WEB = 'web',
        MOBILE = 'mobile',
}

@Schema({ timestamps: false })
export class RefreshToken {
        @Prop({
                type: Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
        })
        userId!: Types.ObjectId;

        @Prop({
                required: true,
                index: true,
        })
        hashedToken!: string;

        @Prop({
                required: true,
                index: true,
        })
        sessionId!: string;

        @Prop({
                type: String,
                enum: Platform,
                required: true,
        })
        platform!: string;


        @Prop({
                required: true,
        })
        createdAt!: Date;

        @Prop({
                required: true,
                index: true,
        })
        expiresAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ userId: 1, sessionId: 1 });
