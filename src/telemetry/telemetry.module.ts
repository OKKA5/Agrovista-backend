import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryReading, TelemetryReadingSchema } from '../schemas/telemetry.schema';
import { MqttListenerService } from './mqtt-listener.service';

@Module({
        imports: [
                MongooseModule.forFeature([
                        { name: TelemetryReading.name, schema: TelemetryReadingSchema },
                ]),
        ],
        controllers: [TelemetryController],
        providers: [TelemetryService, MqttListenerService],
        exports: [TelemetryService],
})
export class TelemetryModule { }
