import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TelemetryReading,
  TelemetryReadingDocument,
} from "../schemas/telemetry.schema";
import { CreateTelemetryDto } from "./dto/create-telemetry.dto";
import { QueryTelemetryDto } from "./dto/query-telemetry.dto";

@Injectable()
export class TelemetryService {
  private readonly SENSOR_FIELDS = [
    "soilNitrogen",
    "soilPhosphorus",
    "soilPotassium",
    "soilPh",
    "temperature",
    "humidity",
    "soilMoisture",
  ] as const;

  constructor(
    @InjectModel(TelemetryReading.name)
    private telemetryModel: Model<TelemetryReadingDocument>,
  ) {}

  // ==================== INGESTION ====================

  async create(dto: CreateTelemetryDto): Promise<TelemetryReading> {
    const readingTime = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const hourStart = new Date(
      readingTime.getFullYear(),
      readingTime.getMonth(),
      readingTime.getDate(),
      readingTime.getHours(),
    );

    const set: any = {};
    const dtoAny = dto as Record<string, any>;
    const setAny = set as Record<string, any>;

    for (const f of this.SENSOR_FIELDS) {
      if (dtoAny[f] != null) setAny[f] = dtoAny[f];
    }

    return this.telemetryModel.findOneAndUpdate(
      {
        parcelId: new Types.ObjectId(dto.parcelId),
        timestamp: hourStart,
      },
      {
        $set: {
          ...set,
          source: dto.source,
        },
        $setOnInsert: {
          parcelId: new Types.ObjectId(dto.parcelId),
          timestamp: hourStart,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }



  // ==================== READS ====================

  async findAll(query: QueryTelemetryDto): Promise<TelemetryReading[]> {
    const filter: any = {};

    if (query.parcelId) {
      try {
        filter.parcelId = new Types.ObjectId(query.parcelId);
      } catch {
        // Invalid ObjectId string — return empty rather than crash
        return [];
      }
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
      if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
    }

    const docs = await this.telemetryModel
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .exec();

    return docs;
  }

  async findLatest(parcelId: string): Promise<TelemetryReading | null> {
    let objectId: Types.ObjectId;
    try {
      objectId = new Types.ObjectId(parcelId);
    } catch {
      return null;
    }

    const doc = await this.telemetryModel
      .findOne({ parcelId: objectId })
      .sort({ timestamp: -1, _id: -1 })
      .lean()
      .exec();

    return doc;
  }

  async findLatestForParcels(parcelIds: string[]): Promise<any[]> {
    if (!parcelIds.length) return [];

    const objectIds = parcelIds
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => id !== null);

    if (!objectIds.length) return [];

    const results = await this.telemetryModel.aggregate([
      { $match: { parcelId: { $in: objectIds } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$parcelId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    return results;
  }

  async findById(id: string): Promise<TelemetryReading | null> {
    const doc = await this.telemetryModel.findById(id).exec();
    return doc;
  }
}
