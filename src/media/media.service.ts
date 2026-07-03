import {
        Injectable,
        BadRequestException,
        InternalServerErrorException,
        NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentEntity, DocumentType, MediaDocument, ValidationStatus } from '../schemas/document.schema';
import { CloudinaryService } from './cloudinary.service';

export enum DocumentTypeEnum {
        CONTRACT = 'CONTRACT',
        IMAGE = 'IMAGE',
        INVOICE = 'INVOICE',
}

export interface ValidationOptions {
        sizeLimit?: number; // in bytes
        mimeTypeAllowed?: string[];
        required: boolean;
        documentType: DocumentType;
        oldDocId?: string; // Remove old document when uploading new
}

@Injectable()
export class MediaService {
        constructor(
                @InjectModel('DocumentEntity')
                private documentModel: Model<DocumentEntity>,
                private storageProviderService: CloudinaryService,
        ) { }

        async validateAndUpload(
                file: Express.Multer.File,
                options: ValidationOptions,
        ): Promise<MediaDocument | null> {

                if (!file) {
                        if (options.required) {
                                throw new BadRequestException(`${options.documentType} file is required`);
                        }
                        return null;
                }

                // Validate file has content
                if (!file.originalname || file.size === 0) {
                        throw new BadRequestException('File is empty or invalid');
                }

                // Normalize mimetype for PDF
                const mimetype = file.mimetype?.toLowerCase() || '';
                const isPdf = mimetype === 'application/pdf' ||
                        mimetype === 'application/x-pdf' ||
                        file.originalname.toLowerCase().endsWith('.pdf');

                // Step 2: Validate MIME type
                if (options.mimeTypeAllowed && options.mimeTypeAllowed.length > 0) {
                        // Allow PDF variations if PDF
                        const allowedMimes = isPdf
                                ? [...options.mimeTypeAllowed, 'application/x-pdf']
                                : options.mimeTypeAllowed;
                        if (!allowedMimes.includes(mimetype)) {
                                throw new BadRequestException(
                                        `Only ${options.mimeTypeAllowed.join(', ')} files are allowed. Received: ${mimetype || 'unknown'}`,
                                );
                        }
                }

                // Step 3: Validate file size
                if (options.sizeLimit) {
                        if (file.size > options.sizeLimit) {
                                const maxSizeMB = Math.round(options.sizeLimit / (1024 * 1024));
                                throw new BadRequestException(
                                        `File exceeds ${maxSizeMB}MB limit`,
                                );
                        }
                }

                // Step 4: Validate PDF integrity (basic check)
                if (isPdf) {
                        this.validatePdfIntegrity(file);
                }

                // Step 5: Delete old document if oldDocId provided
                if (options.oldDocId) {
                        await this.deleteDocument(options.oldDocId);
                }

                const uploadResult = await this.storageProviderService.uploadFile(
                        file,
                        options.documentType,
                );

                if (!uploadResult) {
                        throw new InternalServerErrorException(
                                'Failed to upload file to storage provider',
                        );
                }

                // Step 7: Create document
                const document = await this.documentModel.create({
                        fileName: file.originalname,
                        fileStorageId: uploadResult.id,
                        fileUrl: uploadResult.webViewLink,
                        fileSize: file.size,
                        documentType: options.documentType,
                        mimeType: file.mimetype,
                        uploadedAt: new Date(),
                        uploadedBy: new Types.ObjectId(),
                        validationStatus: 'PENDING',
                        validationErrors: [],
                });

                return document;
        }

        /**
         * Delete document from MongoDB and storage provider
         * CHANGE: Helper method for cleanup
         */
        async deleteDocument(documentId: string): Promise<void> {
                try {
                        const document = await this.documentModel.findById(documentId);

                        if (!document) {
                                return; // Document already doesn't exist, no error
                        }

                        // Delete from provider
                        await this.storageProviderService.deleteFile(document.fileStorageId);

                        // Delete from MongoDB
                        await this.documentModel.findByIdAndDelete(documentId);
                } catch (error) {
                        console.error('Document deletion error:', error);
                }
        }

        /**
         * Get document by ID
         * CHANGE: Fetch document metadata
         */
        async getDocument(documentId: string): Promise<DocumentEntity> {
                const document = await this.documentModel.findById(documentId);

                if (!document) {
                        throw new NotFoundException('Document not found');
                }

                return document;
        }

        /**
         * Basic PDF integrity check
         * CHANGE: Validates PDF structure
         */
        private validatePdfIntegrity(file: Express.Multer.File): void {
                if (!file || !file.buffer || file.size === 0) {
                        return;
                }
                try {
                        const pdfHeader = file.buffer.slice(0, 4).toString('hex');
                        if (pdfHeader !== '25504446') {
                                throw new BadRequestException('Invalid PDF file');
                        }
                } catch (e) {
                        if (e instanceof BadRequestException) {
                                throw e;
                        }
                }
        }


        async validateAndUploadImage(
                file: Express.Multer.File,
                required: boolean = true,
                oldDocId?: string,
        ): Promise<MediaDocument | null> {
                return this.validateAndUpload(file, {
                        required,
                        documentType: DocumentType.IMAGE,
                        mimeTypeAllowed: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
                        sizeLimit: 5 * 1024 * 1024, // 5MB
                        oldDocId,
                });
        }

        /**
         * Update document validation status
         * CHANGE: For future validation pipeline
         */
        async updateValidationStatus(
                documentId: string,
                status: ValidationStatus,
                errors?: string[],
        ): Promise<DocumentEntity | null> {
                return await this.documentModel.findByIdAndUpdate(
                        documentId,
                        {
                                validationStatus: status,
                                validationErrors: errors || [],
                        },
                        { new: true },
                );
        }
} 
