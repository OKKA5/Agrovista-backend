import { Module } from "@nestjs/common";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { CropsModule } from "../crops/crops.module";
import { TelemetryModule } from "../telemetry/telemetry.module";
import { ParcelsModule } from "../parcels/parcels.module";
import { LocationsModule } from "../locations/locations.module";

@Module({
  imports: [CropsModule, TelemetryModule, ParcelsModule, LocationsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
