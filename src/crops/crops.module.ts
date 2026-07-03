import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { Crop, CropSchema } from '../schemas/crop.schema';
import { MediaModule } from '../media/media.module';

@Module({
        imports: [
                MongooseModule.forFeature([{ name: Crop.name, schema: CropSchema }]),
                MediaModule
        ],
        controllers: [CropsController],
        providers: [CropsService],
        exports: [CropsService],
})
export class CropsModule { }
