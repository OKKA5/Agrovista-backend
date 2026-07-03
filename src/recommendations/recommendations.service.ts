import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { CropsService } from "../crops/crops.service";
import { TelemetryService } from "../telemetry/telemetry.service";
import { ParcelsService } from "../parcels/parcels.service";
import { LocationsService } from "../locations/locations.service";

export interface CropRecommendation {
  cropId: string;
  cropName: string;
  finalScore: string;
  telemetryScore: string;
  profitScore: string;
  reasons: string[];
}

const TELEMETRY_WEIGHT = 0.7;
const PROFIT_WEIGHT = 0.3;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly cropsService: CropsService,
    private readonly telemetryService: TelemetryService,
    private readonly parcelsService: ParcelsService,
    private readonly locationsService: LocationsService,
  ) {}

  async recommendCrops(
    parcelId: string,
    userId: object,
  ): Promise<CropRecommendation[]> {
    if (!parcelId) {
      throw new BadRequestException("parcelId is required");
    }

    const parcel = await this.parcelsService.findById(parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const p = parcel as any;
    if (p.ownerId.toString() !== userId) {
      throw new ForbiddenException("You can only request recommendations for your own parcels");
    }

    const locationId = p.locationId;
    if (!locationId) {
      throw new BadRequestException(
        `Parcel ${parcelId} has no location assigned`,
      );
    }

    const location = await this.locationsService.findById(locationId);
    if (!location) {
      throw new NotFoundException(
        `Location ${locationId} not found for parcel ${parcelId}`,
      );
    }

    const region = (location as any).region;
    if (!region) {
      throw new BadRequestException(
        `Location ${locationId} has no region assigned`,
      );
    }

    const crops = await this.cropsService.findAll();
    if (!crops || crops.length === 0) {
      throw new NotFoundException(
        "No crops available in the system. Add crops first before requesting recommendations.",
      );
    }

    const telemetry = await this.telemetryService.findLatest(parcelId);
    if (!telemetry) {
      throw new NotFoundException(
        `No telemetry readings found for parcel ${parcel.parcelName}.`,
      );
    }

    const regionCrops = crops.filter((c) => {
      const schedules = (c as any).schedules;
      if (!schedules) return false;
      const regions = Array.isArray(schedules.regions)
        ? schedules.regions
        : [];
      if (regions.length === 0) return false;
      return regions.some(
        (r: string) => r === region,
      );
    });

    if (regionCrops.length === 0) {
      throw new NotFoundException(
        `No crops found supporting region "${region}". Update crop schedules to include this region.`,
      );
    }

    const inSeasonCrops = regionCrops.filter((crop) =>
      this.isInSeason(crop),
    );

    if (inSeasonCrops.length === 0) {
      throw new NotFoundException(
        `No crops are currently in sowing season for region "${region}". Try again during the appropriate planting window.`,
      );
    }

    return this.scoreAndReturn(inSeasonCrops, telemetry);
  }

  private scoreAndReturn(
    crops: any[],
    telemetry: any,
  ): CropRecommendation[] {
    const stage1Map = new Map<string, any>();
    for (const crop of crops) {
      const cropId = (crop as any)._id.toString();
      const thresholds = (crop as any).thresholds;
      if (Array.isArray(thresholds) && thresholds.length > 0) {
        const stage1 =
          thresholds.find((t: any) => t.stage === 1) ?? thresholds[0];
        stage1Map.set(cropId, stage1);
      }
    }

    const scored: Array<{
      crop: any;
      telemetryScore: number;
      profitScore: number;
      reasons: string[];
    }> = [];

    for (const crop of crops) {
      const cropId = (crop as any)._id.toString();
      const stage1 = stage1Map.get(cropId);

      const { score, reasons } = this.scoreTelemetry(
        telemetry,
        stage1,
        crop.name,
      );

      scored.push({
        crop,
        telemetryScore: score,
        profitScore: 0,
        reasons,
      });
    }

    const profits = scored
      .map((s) => (s.crop as any).acreProfit ?? 0)
      .filter((p: number) => !isNaN(p));

    const minProfit = profits.length ? Math.min(...profits) : 0;
    const maxProfit = profits.length ? Math.max(...profits) : 0;
    const profitRange = maxProfit - minProfit;

    for (const s of scored) {
      const profit = (s.crop as any).acreProfit ?? 0;
      s.profitScore =
        profitRange > 0 ? (profit - minProfit) / profitRange : 0;

      if (s.profitScore >= 0.7) {
        s.reasons.push(
          `High profitability ($${profit.toFixed(0)}/acre)`,
        );
      }
    }

    return scored
      .map((s) => {
        const finalScore =
          TELEMETRY_WEIGHT * s.telemetryScore +
          PROFIT_WEIGHT * s.profitScore;

        return {
          cropId: (s.crop as any)._id.toString(),
          cropName: s.crop.name,
          finalScore: `${Math.round(finalScore * 100)}%`,
          telemetryScore: `${Math.round(s.telemetryScore * 100)}%`,
          profitScore: `${Math.round(s.profitScore * 100)}%`,
          reasons: s.reasons,
          _finalScore: finalScore,
        };
      })
      .sort((a, b) => b._finalScore - a._finalScore)
      .map(({ _finalScore, ...rest }) => rest);
  }

  private isInSeason(crop: any): boolean {
    const schedules = crop.schedules;
    if (!schedules || !schedules.sowing) return false;

    const sowing = schedules.sowing;
    if (!sowing.early || !sowing.late) return false;
    if (!sowing.early.month || !sowing.early.day) return false;
    if (!sowing.late.month || !sowing.late.day) return false;

    const now = new Date();
    const currentDayOfYear = this.dayOfYear(now);

    const sowingStart = this.dayOfYearFromDate(
      sowing.early.month,
      sowing.early.day,
    );
    const sowingEnd = this.dayOfYearFromDate(
      sowing.late.month,
      sowing.late.day,
    );

    if (sowingStart <= sowingEnd) {
      return (
        currentDayOfYear >= sowingStart && currentDayOfYear <= sowingEnd
      );
    }

    return (
      currentDayOfYear >= sowingStart || currentDayOfYear <= sowingEnd
    );
  }

  private dayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private dayOfYearFromDate(month: number, day: number): number {
    return this.dayOfYear(new Date(new Date().getFullYear(), month - 1, day));
  }

  private scoreTelemetry(
    telemetry: any,
    stage1: any | undefined,
    cropName: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];

    if (!stage1) {
      return { score: 0, reasons: ["No threshold data defined for this crop"] };
    }

    const elements = stage1.soilElements;
    if (!elements) {
      return { score: 0, reasons: ["No soil element thresholds defined"] };
    }

    const mapping: Array<{
      telemetryKey: string;
      elementKey: string;
      label: string;
    }> = [
      {
        telemetryKey: "soilNitrogen",
        elementKey: "N",
        label: "Nitrogen",
      },
      {
        telemetryKey: "soilPhosphorus",
        elementKey: "P",
        label: "Phosphorus",
      },
      {
        telemetryKey: "soilPotassium",
        elementKey: "K",
        label: "Potassium",
      },
      { telemetryKey: "soilPh", elementKey: "ph", label: "pH" },
      {
        telemetryKey: "temperature",
        elementKey: "temperature",
        label: "Temperature",
      },
      {
        telemetryKey: "humidity",
        elementKey: "humidity",
        label: "Humidity",
      },
      {
        telemetryKey: "soilMoisture",
        elementKey: "soilMoisture",
        label: "Soil moisture",
      },
    ];

    let totalScore = 0;
    let count = 0;

    for (const m of mapping) {
      const value = telemetry[m.telemetryKey];
      const threshold = elements[m.elementKey];

      if (value == null || !threshold) continue;

      const score = this.scoreElement(value, threshold);
      totalScore += score;
      count++;

      if (score >= 0.8) {
        reasons.push(`${m.label} conditions are ideal`);
      } else if (score >= 0.5) {
        reasons.push(`${m.label} is within acceptable range`);
      }
    }

    if (count === 0) {
      return { score: 0, reasons: ["No matching telemetry readings to compare against thresholds"] };
    }

    const avgScore = totalScore / count;

    if (avgScore >= 0.8) {
      reasons.unshift(
        `Soil and climate conditions are excellent for ${cropName}`,
      );
    } else if (avgScore >= 0.5) {
      reasons.unshift(`Conditions are suitable for ${cropName}`);
    }

    return { score: avgScore, reasons };
  }

  private scoreElement(
    value: number,
    threshold: {
      min?: number;
      max?: number;
      optimalMin?: number;
      optimalMax?: number;
    },
  ): number {
    const { min, max, optimalMin, optimalMax } = threshold;

    if (min == null || max == null) return 0;

    const range = max - min;
    if (range === 0) return 0;

    const clamped = Math.max(min, Math.min(max, value));

    if (optimalMin != null && optimalMax != null) {
      const expandedMin = optimalMin * 0.95;
      const expandedMax = optimalMax * 1.05;

      if (clamped >= expandedMin && clamped <= expandedMax) {
        return 1.0;
      }

      const mid = (optimalMin + optimalMax) / 2;
      return Math.exp(-Math.abs(clamped - mid) / range);
    }

    const mid = (min + max) / 2;
    return Math.exp(-Math.abs(clamped - mid) / range);
  }
}
