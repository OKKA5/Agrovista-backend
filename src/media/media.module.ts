import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DocumentSchema, DocumentEntity } from '../schemas/document.schema';
import { MediaService } from './media.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
        imports: [
                ConfigModule,
                MongooseModule.forFeature([
                        { name: 'DocumentEntity', schema: DocumentSchema },
                ]),
        ],
        providers: [MediaService, CloudinaryService],
        exports: [MediaService],
})
export class MediaModule { }
