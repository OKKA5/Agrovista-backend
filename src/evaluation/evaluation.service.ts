import { Injectable, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { TelemetryService } from "../telemetry/telemetry.service";
import { CropsService } from "../crops/crops.service";
import { ParcelsService } from "../parcels/parcels.service";
import { AlertsService } from "../alerts/alerts.service";
import { NotificationsService } from "../notifications/notifications.service";

export interface ThresholdCheck {
  element: string;
  value: number;
  threshold: {
    min?: number;
    max?: number;
    optimalMin?: number;
    optimalMax?: number;
  };
  violated: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
}

class SimpleLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.next();
        }
      };

      if (this.running < this.limit) {
        this.running++;
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private next() {
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }
}

@Injectable()
export class EvaluationService {
  private readonly limiter = new SimpleLimiter(10);

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly cropsService: CropsService,
    private readonly parcelsService: ParcelsService,
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 51 13 * * *')
  async evaluateAllParcels(): Promise<{
    evaluated: number;
    violations: number;
  }> {
    const parcels = await this.parcelsService.findAll();

    if (!parcels || parcels.length === 0) {
      return { evaluated: 0, violations: 0 };
    }

    const parcelIds = parcels.map((p) => (p as any)._id.toString());

    const cropIds = [
      ...new Set(
        parcels
          .map((p) => (p as any).currentCrop?.cropId?.toString())
          .filter(Boolean),
      ),
    ];

    const [crops, telemetryList] = await Promise.all([
      this.cropsService.findByIds(cropIds),
      this.telemetryService.findLatestForParcels(parcelIds),
    ]);

    const cropMap = new Map(crops.map((c) => [(c as any)._id.toString(), c]));

    const telemetryMap = new Map(
      telemetryList.map((t) => [(t as any).parcelId.toString(), t]),
    );

    let evaluated = 0;
    let violationsCount = 0;
    const alertPayloads: any[] = [];

    await Promise.all(
      parcels.map((parcel) =>
        this.limiter.run(async () => {
          const p = parcel as any;
          if (p.status !== "APPROVED") return;

          const parcelId = p._id.toString();

          const cropId = p.currentCrop?.cropId?.toString();
          if (!cropId) return;

          const crop = cropMap.get(cropId);
          if (!crop || !(crop as any).thresholds?.length) return;

          const telemetry = telemetryMap.get(parcelId);

          if (!telemetry) {
            alertPayloads.push({
              parcelId,
              cropId,
              element: "telemetry",
              thresholdValue: { min: 0, max: 0 },
              actualValue: 0,
              severity: "warning",
              message: "No telemetry readings found",
              notifiedVia: ["in-app"],
            });

            evaluated++;
            return;
          }

          const violations = this.evaluateAgainstThresholds(
            telemetry,
            (crop as any).thresholds,
            p.currentCrop?.plantedOn,
          );

          if (violations.length > 0) {
            violationsCount += violations.length;

            for (const v of violations) {
              alertPayloads.push({
                parcelId,
                telemetryReadingId: (telemetry as any)._id.toString(),
                cropId,
                element: v.element,
                thresholdValue: {
                  min: v.threshold.min ?? 0,
                  max: v.threshold.max ?? 0,
                },
                actualValue: v.value,
                severity: v.severity,
                message: v.message,
                notifiedVia: ["in-app"],
              });
            }
          }

          evaluated++;
        }),
      ),
    );

    let alerts: any[] = [];
    if (alertPayloads.length > 0) {
      alerts = await this.alertsService.createMany(alertPayloads, true);
    }

    Promise.all(
      alerts.map((a) =>
        this.notificationsService.sendAlertNotification((a as any)._id),
      ),
    );

    return { evaluated, violations: violationsCount };
  }

  async evaluateParcel(parcelId: string): Promise<ThresholdCheck[]> {
    if (!parcelId) {
      throw new Error("parcelId is required");
    }

    const parcel = await this.parcelsService.findById(parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const p = parcel as any;
    if (p.status !== "APPROVED") {
      throw new Error("Parcel is not approved");
    }

    const cropId = p.currentCrop?.cropId?.toString();
    if (!cropId) {
      throw new Error("Parcel has no crop assigned");
    }

    const [crop, telemetry] = await Promise.all([
      this.cropsService.findById(cropId),
      this.telemetryService.findLatest(parcelId),
    ]);

    if (!crop) {
      throw new NotFoundException("Crop not found");
    }

    if (!telemetry) {
      throw new Error("No telemetry readings for this parcel");
    }

    const violations = this.evaluateAgainstThresholds(
      telemetry,
      (crop as any).thresholds,
      p.currentCrop?.plantedOn,
    );

    if (violations.length > 0) {
      const alertPayloads = violations.map((v) => ({
        parcelId,
        telemetryReadingId: (telemetry as any)._id.toString(),
        cropId,
        element: v.element,
        thresholdValue: {
          min: v.threshold.min ?? 0,
          max: v.threshold.max ?? 0,
          optimalMin: v.threshold.optimalMin ?? 0,
          optimalMax: v.threshold.optimalMax ?? 0,
        },
        actualValue: v.value,
        severity: v.severity,
        message: v.message,
        notifiedVia: ["in-app"],
      }));

      const alerts = await this.alertsService.createMany(alertPayloads, true);

      for (const alert of alerts) {
        await this.notificationsService.sendAlertNotification(
          (alert as any)._id.toString(),
        );
      }
    }

    return violations;
  }

  private evaluateAgainstThresholds(
    telemetry: any,
    cropThresholds: any[],
    plantedOn?: Date,
  ): ThresholdCheck[] {
    const threshold = this.pickThresholdForStage(cropThresholds, plantedOn);
    if (!threshold) return [];

    const readings = {
      soilNitrogen: telemetry.soilNitrogen,
      soilPhosphorus: telemetry.soilPhosphorus,
      soilPotassium: telemetry.soilPotassium,
      soilPh: telemetry.soilPh,
      temperature: telemetry.temperature,
      humidity: telemetry.humidity,
      soilMoisture: telemetry.soilMoisture,
    };

    return this.evaluateReadings(readings, threshold.soilElements || {});
  }

  private pickThresholdForStage(cropThresholds: any[], plantedOn?: Date): any {
    if (!cropThresholds?.length) return null;
    if (!plantedOn) return cropThresholds[0];

    const days =
      (Date.now() - new Date(plantedOn).getTime()) / (1000 * 60 * 60 * 24);

    for (const t of cropThresholds) {
      const duration = t.stageDuration || 30;
      if (days < t.stage * duration) return t;
    }

    return cropThresholds[cropThresholds.length - 1];
  }

  private evaluateReadings(
    readings: Record<string, number>,
    thresholds: Record<string, any>,
  ): ThresholdCheck[] {
    const map: Record<string, string> = {
      soilNitrogen: "N",
      soilPhosphorus: "P",
      soilPotassium: "K",
      soilPh: "ph",
      temperature: "temperature",
      humidity: "humidity",
      soilMoisture: "soilMoisture",
    };

    const results: ThresholdCheck[] = [];

    for (const key in map) {
      const element = map[key];
      const value = readings[key];
      const t = thresholds[element];

      if (value == null || !t) continue;

      const { min, max, optimalMin, optimalMax } = t;

      if (min !== undefined && value <= min) {
        results.push({
          element,
          value,
          threshold: t,
          violated: true,
          severity: "critical",
          message: `${element} critically low ( Value: ${value} <= ${min})`,
        });
      } else if (
        optimalMin !== undefined &&
        value > min &&
        value < optimalMin
      ) {
        results.push({
          element,
          value,
          threshold: t,
          violated: true,
          severity: "warning",
          message: `${element} below optimal range ( Value: ${value} < ${optimalMin})`,
        });
      } else if (
        optimalMax !== undefined &&
        max !== undefined &&
        value > optimalMax &&
        value < max
      ) {
        results.push({
          element,
          value,
          threshold: t,
          violated: true,
          severity: "warning",
          message: `${element} above optimal range ( Value: ${value} > ${optimalMax})`,
        });
      } else if (max !== undefined && value >= max) {
        results.push({
          element,
          value,
          threshold: t,
          violated: true,
          severity: "critical",
          message: `${element} critically high ( Value: ${value} >= ${max})`,
        });
      }
    }

    return results;
  }
  
}
