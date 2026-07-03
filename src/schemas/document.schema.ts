import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = DocumentEntity & Document;

export enum DocumentType {
        CONTRACT = 'CONTRACT',
        IMAGE = 'IMAGE'
}

export enum ValidationStatus {
        PENDING = 'PENDING',
        VALIDATED = 'VALIDATED',
        REJECTED = 'REJECTED'
}

@Schema({ timestamps: true })
export class DocumentEntity {
        @Prop({ required: true })
        fileName: string;

        @Prop({ required: true })
        fileStorageId: string;

        @Prop({ required: true })
        fileUrl: string;

        @Prop({ required: true })
        fileSize: number; // in bytes

        @Prop({ type: String, enum: DocumentType, required: true })
        documentType: DocumentType;

        @Prop({ required: true })
        mimeType: string;

        @Prop({ required: true, default: Date.now })
        uploadedAt: Date;

        @Prop({ type: Types.ObjectId, ref: 'User', required: true })
        uploadedBy: Types.ObjectId;

        // following two properties are for future extendability
        @Prop({
                type: String,
                enum: ValidationStatus,
                default: ValidationStatus.PENDING,
        })
        validationStatus: string;

        @Prop({ type: [String], default: [] })
        validationErrors: string[];

        @Prop({ default: Date.now })
        createdAt: Date;

        @Prop({ default: Date.now })
        updatedAt: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);

DocumentSchema.index({ fileUrl: 1 });
DocumentSchema.index({ uploadedBy: 1 });
DocumentSchema.index({ documentType: 1 });
