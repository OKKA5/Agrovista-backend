import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { CropsModule } from '../crops/crops.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { AlertsModule } from '../alerts/alerts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TelemetryModule,
    CropsModule,
    ParcelsModule,
    AlertsModule,
    NotificationsModule,
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}