import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Alert,
  AlertDocument,
  AlertSeverity,
  AlertStatus,
} from "../schemas/alert.schema";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { QueryAlertsDto } from "../telemetry/dto/query-telemetry.dto";
import { Parcel, ParcelDocument } from "../schemas/parcel.schema";

@Injectable()
export class AlertsService {
  private readonly cooldownMinutes = 15;
  private readonly dedupeKeys = new Map<string, Date>();

  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<AlertDocument>,
    @InjectModel(Parcel.name)
    private parcelModel: Model<ParcelDocument>,
  ) {}

  async create(
    createAlertDto: CreateAlertDto & { telemetryReadingId?: any },
    skipDedupe?: boolean,
  ): Promise<(Alert & { id: string }) | null> {
    const parcelId = (createAlertDto.parcelId as any).toString
      ? (createAlertDto.parcelId as any).toString()
      : createAlertDto.parcelId;
    const cropId = (createAlertDto.cropId as any).toString
      ? (createAlertDto.cropId as any).toString()
      : createAlertDto.cropId;

    const dedupeKey = `${parcelId}-${createAlertDto.element}-${cropId}`;

    if (!skipDedupe) {
      const lastAlert = this.dedupeKeys.get(dedupeKey);

      if (lastAlert) {
        const timeSinceLastAlert =
          (Date.now() - lastAlert.getTime()) / (1000 * 60);
        if (timeSinceLastAlert < this.cooldownMinutes) {
          return null;
        }
      }
    }

    const alertData = {
      ...createAlertDto,
      parcelId: new Types.ObjectId(parcelId),
      cropId: new Types.ObjectId(cropId),
      status: AlertStatus.ACTIVE,
    };

    const saved = (await this.alertModel.create(alertData)) as Alert & {
      id: string;
    };
    this.dedupeKeys.set(dedupeKey, new Date());

    return saved;
  }

  async findAll(query: QueryAlertsDto): Promise<Alert[]> {
    const filter: any = {};

    if (query.parcelId) {
      filter.parcelId = new Types.ObjectId(query.parcelId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.severity) {
      filter.severity = query.severity;
    }

    return this.alertModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .exec();
  }

  async findById(id: string): Promise<Alert | null> {
    return this.alertModel.findById(id).exec();
  }

  async acknowledge(alertId: string, userId: string): Promise<Alert | null> {
    const alert = await this.alertModel.findById(alertId);

    if (!alert) {
      console.log("❌ Alert not found");
      throw new NotFoundException("Alert not found");
    }

    const updatedAlert = await this.alertModel.findByIdAndUpdate(
      alertId,
      { acknowledgedAt: new Date(), status: "acknowledge" },
      { new: true },
    );

    return updatedAlert;
  }

  async resolve(alertId: string, userId: string): Promise<Alert | null> {
    const alert = await this.alertModel.findById(alertId);

    if (!alert) {
      console.log("❌ Alert not found");
      throw new NotFoundException("Alert not found");
    }

    const parcel = await this.parcelModel.findById(alert.parcelId);

    if (!parcel) {
      console.log("❌ Parcel not found");
      throw new NotFoundException("Parcel not found");
    }

    if(alert.status!= AlertStatus.ACKNOWLEDGE){
      console.log("❌ Alert must be acknowledged before resolving");
      throw new ForbiddenException({
        message: "Alert must be acknowledged before resolving",
      });
    }

    if (parcel.moderatorId?.toString() !== userId) {
      console.log("❌ Unauthorized access");
      throw new ForbiddenException({
        message: "Only the parcel moderator can resolve",
      });
    }

    const updatedAlert = await this.alertModel.findByIdAndUpdate(
      alertId,
      {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    return updatedAlert;
  }

  async findActiveByParcel(parcelId: string): Promise<Alert[]> {
    return this.alertModel
      .find({
        parcelId: new Types.ObjectId(parcelId),
        status: AlertStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createMany(
    alertPayloads: any[],
    skipDedupe?: boolean,
  ): Promise<Alert[]> {
    if (!alertPayloads.length) return [];
    const alerts = [];
    for (const payload of alertPayloads) {
      const alert = await this.create(
        { ...payload, status: AlertStatus.ACTIVE },
        skipDedupe,
      );
      if (alert) alerts.push(alert);
    }
    return alerts;
  }

  async findAllAlertsByUser(
    parcelId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!userId) {
      return "userId is undefined or empty";
    }
    const parcels = await this.parcelModel
      .find({
        $or: [
          { ownerId: new Types.ObjectId(userId) },
          { moderatorId: new Types.ObjectId(userId) },
        ],
      })
      .exec();
    if (!parcels.length) {
      return { alerts: [], total: 0, page, totalPages: 0 };
    }
    const parcelIds = parcels.map((parcel) => new Types.ObjectId(parcel._id));
    const filter: any = {
      parcelId: { $in: parcelIds },
    };

    if (parcelId) {
      filter.parcelId = new Types.ObjectId(parcelId);
    }

    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter),
    ]);

    return {
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllAlertsByParcel(
    parcelId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!parcelId) {
      throw new NotFoundException("Parcel ID is invalid");
    }

    const parcel = await this.parcelModel.findById(parcelId).exec();
    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const isOwner = parcel.ownerId.toString() === userId;
    const isModerator =
      parcel.moderatorId && parcel.moderatorId.toString() === userId;

    if (!isOwner && !isModerator) {
      throw new ForbiddenException("Access denied to this parcel's alerts");
    }

    const filter = { parcelId: new Types.ObjectId(parcelId) };
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter),
    ]);

    return {
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAlertDetails(alertId: string): Promise<Alert | null> {
    if (!alertId) {
      throw new NotFoundException("Parcel ID os invalid");
    }

    const alert = await this.alertModel.findById(new Types.ObjectId(alertId));

    if (!alert) {
      throw new NotFoundException("Alert not found");
    }

    return alert;
  }
}