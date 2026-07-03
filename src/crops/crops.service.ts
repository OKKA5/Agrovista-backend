import {
        ConflictException,
        Injectable,
        NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Crop, CropDocument } from "../schemas/crop.schema";
import { CreateCropDto } from "./dto/create-crop.dto";
import { UpdateCropDto } from "./dto/update-crop.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { MediaService } from "../media/media.service";

@Injectable()
export class CropsService {
        constructor(
                @InjectModel(Crop.name) private cropModel: Model<CropDocument>,
                private readonly mediaService: MediaService
        ) {
                this.cropModel.syncIndexes();
        }


        async createCrop(createCropDto: CreateCropDto, file: Express.Multer.File): Promise<Crop> {
                const imageDoc = await this.mediaService.validateAndUploadImage(file, true);

                if (!imageDoc) {
                        throw new ConflictException('Failed to upload crop image');
                }

                try {
                        const crop = new this.cropModel({
                                ...createCropDto,
                                image: {
                                        id: imageDoc._id,
                                        url: imageDoc.fileUrl,
                                },
                        });
                        return await crop.save();
                } catch (error: any) {
                        if (imageDoc._id) {
                                await this.mediaService.deleteDocument(imageDoc._id.toString());
                        }

                        if (error.code === 11000) {
                                const field = Object.keys(error.keyPattern)[0];
                                throw new ConflictException(`A crop with this ${field} already exists`);
                        }
                        throw error;
                }
        }

        async updateCrop(id: string, updateCropDto: UpdateCropDto, file?: Express.Multer.File): Promise<Crop> {
                try {
                        const updateData: any = { ...updateCropDto };

                        if (file) {
                                const imageDoc = await this.mediaService.validateAndUploadImage(file, true);
                                if (!imageDoc) {
                                        throw new ConflictException('Failed to upload crop image');
                                }
                                updateData.image = {
                                        id: imageDoc._id,
                                        url: imageDoc.fileUrl,
                                };
                        }

                        const updatedCrop = await this.cropModel
                                .findByIdAndUpdate(
                                        id,
                                        { $set: updateData },
                                        { new: true, runValidators: true },
                                )
                                .exec();

                        if (!updatedCrop) {
                                throw new NotFoundException(`Crop with ID ${id} not found`);
                        }

                        return updatedCrop;
                } catch (error: any) {
                        if (error.code === 11000) {
                                const field = Object.keys(error.keyPattern)[0];
                                throw new ConflictException(`A crop with this ${field} already exists`);
                        }
                        throw error;
                }
        }

        async findAll(): Promise<Crop[]> {
                return this.cropModel.find().exec();
        }

        async findById(id: string): Promise<Crop | null> {
                return this.cropModel.findById(id).exec();
        }

        async findByIds(ids: string[]): Promise<Crop[]> {
                return this.cropModel.find({ _id: { $in: ids } }).exec();
        }

        async addSchedule(cropId: string, createScheduleDto: CreateScheduleDto): Promise<Crop> {
                const crop = await this.cropModel.findById(cropId);
                if (!crop) {
                        throw new NotFoundException(`Crop with ID ${cropId} not found`);
                }

                const schedule = {
                        regions: createScheduleDto.regions,
                        sowing: createScheduleDto.sowing,
                        harvest: createScheduleDto.harvest,
                        growingPeriodMin: createScheduleDto.growingPeriodMin,
                        growingPeriodMax: createScheduleDto.growingPeriodMax,
                };

                crop.schedules = schedule as any;
                return await crop.save();
        }
}
