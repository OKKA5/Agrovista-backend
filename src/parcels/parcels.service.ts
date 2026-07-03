import { NotificationsService } from "./../notifications/notifications.service";
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Parcel, ParcelDocument, ParcelStatus, ParcelManaged } from "../schemas/parcel.schema";
import { CreateParcelDto } from "./dto/create-parcel.dto";
import { UpdateParcelDto } from "./dto/update-parcel.dto";
import { ParcelStatusDto } from "./dto/parcel-status.dto";
import { MediaService } from "../media/media.service";
import { CropsService } from "../crops/crops.service";
import { DocumentType, MediaDocument } from "../schemas/document.schema";
import { LocationsService } from "../locations/locations.service";
import { UsersService } from "../users/users.service";
import { Admin, AdminDocument } from "../schemas/admin.schema";

@Injectable()
export class ParcelsService {
  constructor(
    @InjectModel(Parcel.name) private parcelModel: Model<ParcelDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private mediaService: MediaService,
    private cropsService: CropsService,
    private notificationsService: NotificationsService,
    private readonly locationsService: LocationsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async create(
    createParcelDto: CreateParcelDto,
    contractFile: Express.Multer.File,
    userId: string,
  ): Promise<ParcelDocument> {
    //validate location id
    await this.locationsService.validateId(createParcelDto.locationId, [2]);

    const mediaDocument = await this.mediaService.validateAndUpload(
      contractFile,
      {
        required: true,
        sizeLimit: 10 * 1024 * 1024, // 10MB
        mimeTypeAllowed: ["application/pdf"],
        documentType: DocumentType.CONTRACT,
      },
    );

    if (!mediaDocument) {
      throw new BadRequestException("Failed to upload contract");
    }

    const parcel = await this.parcelModel.create({
      parcelName: createParcelDto.parcelName,
      locationId: createParcelDto.locationId,
      size: createParcelDto.size,
      ownerId: new Types.ObjectId(userId),
      status: ParcelStatus.PENDING,
      managedType: createParcelDto.managedType || ParcelManaged.AGROVISTA_MANAGED,
      contract: {
        documentId: mediaDocument._id,
        fileUrl: mediaDocument.fileUrl,
      },
      currentCrop: createParcelDto.currentCropName
        ? {
            cropId: createParcelDto.currentCropId
              ? new Types.ObjectId(createParcelDto.currentCropId)
              : undefined,
            cropName: createParcelDto.currentCropName,
            plantedOn: createParcelDto.plantedOn
              ? new Date(createParcelDto.plantedOn)
              : new Date(),
          }
        : null,
      cropHistory: [],
    });
    return parcel;
  }

  async findAll(userId?: string): Promise<Parcel[]> {
    const query = userId
      ? {
          $or: [
            { ownerId: new Types.ObjectId(userId) },
            { moderatorId: new Types.ObjectId(userId) },
          ],
        }
      : {};
    return this.parcelModel
      .find(query)
      .populate("ownerId", "email firstName lastName")
      .exec();
  }

  async findPending(): Promise<Parcel[]> {
    return this.parcelModel
      .find({ status: ParcelStatus.PENDING })
      .populate("ownerId", "email firstName lastName")
      .exec();
  }

  async findOne(id: string): Promise<ParcelDocument> {
    const parcel = await this.parcelModel
      .findById(id)
      .populate("ownerId", "email firstName lastName")
      .populate("moderatorId", "email firstName lastName")
      .exec();
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${id} not found`);
    }
    return parcel;
  }

  async findById(id: string): Promise<Parcel | null> {
    return this.parcelModel.findById(id).exec();
  }

  async update(
    id: string,
    updateParcelDto: UpdateParcelDto,
    contractFile: Express.Multer.File,
    userId: string,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id);

    if (!parcel) throw new NotFoundException(`Parcel with ID ${id} not found`);

    if (parcel.ownerId._id.toString() !== userId) {
      throw new ForbiddenException("You can only update your own parcels");
    }

    const updateData: any = { ...updateParcelDto };

    if (contractFile) {
      const mediaDocument = await this.mediaService.validateAndUpload(
        contractFile,
        {
          required: true,
          sizeLimit: 10 * 1024 * 1024,
          mimeTypeAllowed: ["application/pdf"],
          documentType: DocumentType.CONTRACT,
          oldDocId: parcel.contract?.documentId?.toString(),
        },
      );

      if (mediaDocument) {
        updateData.contract = {
          documentId: mediaDocument._id,
          fileUrl: mediaDocument.fileUrl,
        };
      }
    }

    const updatedParcel = await this.parcelModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    if (!updatedParcel) {
      throw new InternalServerErrorException("Failed to update parcel");
    }
    return updatedParcel;
  }

  async delete(id: string, userId: string): Promise<void> {

    const parcel = await this.findOne(id);

    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${id} not found`);
    }

    if (parcel.ownerId._id.toString() !== userId) {
      throw new ForbiddenException("You can only delete your own parcels");
    }

    if (parcel.contract?.documentId) {
      await this.mediaService.deleteDocument(
        parcel.contract.documentId.toString(),
      );
    }

    await this.parcelModel.findByIdAndDelete(id).exec();
  }

  async approve(id: string): Promise<Parcel> {
    const parcel = await this.findOne(id);
    const userId = parcel.ownerId._id.toString();

    const title = "Parcel Approved";
    const message = `Parcel ${parcel.parcelName} has been approved and ready for farming now`;
    const type = "parcel"
    if (parcel.status === ParcelStatus.APPROVED) {
      throw new BadRequestException("Parcel is already approved");
    }
    parcel.status = ParcelStatus.APPROVED;

    await this.notificationsService.sendNotification(userId, message, title, type);

    return parcel.save();
  }

  async reject(id: string): Promise<Parcel> {
    const parcel = await this.findOne(id);

    const title = "Parcel Rejected";
    const message = `Sorry, Parcel ${parcel.parcelName} has been rejected`;
    const type = "parcel"
    if (parcel.status === ParcelStatus.REJECTED) {
      throw new BadRequestException("Parcel is already rejected");
    }
    parcel.status = ParcelStatus.REJECTED;

    await this.notificationsService.sendNotification(
      parcel.ownerId._id.toString(),
      message,
      title,
      type
    );

    return parcel.save();
  }

  async assignCrop(
    parcelId: string,
    cropId: string,
    plantedOn?: Date,
  ): Promise<Parcel> {
    const parcel = await this.findOne(parcelId);
    const crop = await this.cropsService.findById(cropId);
    if (!crop) {
      throw new NotFoundException(`Crop with ID ${cropId} not found`);
    }

    parcel.currentCrop = {
      cropId: new Types.ObjectId(cropId),
      cropName: crop.name,
      plantedOn: plantedOn || new Date(),
    };

    return parcel.save();
  }

  async assignModerator(
    parcelId: string,
    moderatorId: string,
  ): Promise<ParcelDocument> {
    const parcel = await this.findOne(parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const moderator = await this.usersService.findOne(moderatorId);
    if (!moderator.isModerator) {
      throw new BadRequestException(`User ${moderatorId} is not a moderator`);
    }
    if (moderator.status !== "ACTIVE") {
      throw new BadRequestException(`Moderator ${moderatorId} is not active`);
    }

    parcel.moderatorId = new Types.ObjectId(moderatorId);
    parcel.managedType = ParcelManaged.AGROVISTA_MANAGED;
    await parcel.save();

    const ownerId = (parcel as any).ownerId?._id?.toString() ?? (parcel as any).ownerId?.toString();
    const parcelName = parcel.parcelName;

    await Promise.all([
      this.notificationsService.sendNotification(
        ownerId,
        `Your parcel "${parcelName}" has been assigned a moderator.`,
        "Moderator Assigned",
        "parcel",
      ),
      this.notificationsService.sendNotification(
        moderatorId,
        `You have been assigned as moderator for parcel "${parcelName}".`,
        "New Parcel Assignment",
        "parcel",
      ),
    ]);

    return parcel;
  }

  async requestModerator(parcelId: string, userId: string): Promise<{ message: string }> {
    const parcel = await this.findOne(parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const ownerId = (parcel as any).ownerId?._id?.toString() ?? (parcel as any).ownerId?.toString();
    if (ownerId !== userId) {
      throw new ForbiddenException("You can only request a moderator for your own parcels");
    }

    if ((parcel as any).moderatorId) {
      throw new BadRequestException("This parcel already has a moderator assigned");
    }

    const admins = await this.usersService.findAllAdmins();
    const parcelName = parcel.parcelName;

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.sendNotification(
          (admin as any)._id.toString(),
          `Parcel "${parcelName}" owner is requesting a moderator assignment.`,
          "Moderator Request",
          "parcel",
        ),
      ),
    );

    return { message: "Moderator request sent to admins" };
  }

  
}
