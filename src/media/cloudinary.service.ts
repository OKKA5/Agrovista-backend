import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { DocumentType } from '../schemas/document.schema';
import 'multer'
@Injectable()
export class CloudinaryService {
        constructor(private configService: ConfigService) {
                // Initialize Cloudinary configuration
                cloudinary.config({
                        cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
                        api_key: this.configService.get('CLOUDINARY_API_KEY'),
                        api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
                });
        }

        async uploadFile(
                file: Express.Multer.File,
                documentType: DocumentType,
        ): Promise<{ id: string; webViewLink: string }> {
                return new Promise((resolve, reject) => {
                        if (!file || !file.buffer || file.size === 0) {
                                return reject(new InternalServerErrorException('Invalid file: buffer is empty'));
                        }

                        const folderPath = this.getTargetFolder(documentType);
                        const resourceType = (documentType === DocumentType.IMAGE) ? 'image' : 'raw';

                        const uploadStream = cloudinary.uploader.upload_stream(
                                {
                                        folder: folderPath,
                                        resource_type: resourceType,
                                        public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
                                },
                                (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                                        if (error) {
                                                console.error('Cloudinary upload error:', error.message);
                                                return reject(new InternalServerErrorException(error.message || 'Cloudinary upload failed'));
                                        }

                                        if (!result) {
                                                return reject(new InternalServerErrorException('Cloudinary upload returned no result'));
                                        }

                                        resolve({
                                                id: result.public_id,
                                                webViewLink: result.secure_url,
                                        });
                                },
                        );

                        streamifier.createReadStream(file.buffer).pipe(uploadStream);
                });
        }

        async deleteFile(publicId: string): Promise<void> {
                try {
                        await cloudinary.uploader.destroy(publicId);
                } catch (error) {
                        console.error('Cloudinary deletion error:', error);
                }
        }

        private getTargetFolder(documentType: DocumentType): string {
                switch (documentType) {
                        case DocumentType.CONTRACT:
                                return 'agrovista/contracts';
                        case DocumentType.IMAGE:
                                return 'agrovista/images';
                        default:
                                return 'agrovista/misc';
                }
        }

}
