import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ParcelsModule } from './parcels/parcels.module';
import { CropsModule } from './crops/crops.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LocationsModule } from './locations/locations.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { FirebaseModule } from './firebase/firebase.module';
@Module({
        imports: [
                ConfigModule.forRoot({
                        isGlobal: true,
                        envFilePath: '.env',
                }),

                MongooseModule.forRootAsync({
                        inject: [ConfigService],
                        useFactory: (configService: ConfigService) => {
                                const uri = configService.get<string>('MONGO_URI');

                                if (!uri) {
                                        throw new Error('❌ MONGO_URI not found in .env');
                                }

                                return { uri };
                        },
                }),

                ScheduleModule.forRoot(),

                AuthModule,
                UsersModule,
                ParcelsModule,
                CropsModule,
                EvaluationModule,
                TelemetryModule,
                AlertsModule,
                NotificationsModule,
                LocationsModule,
                FirebaseModule,
                RecommendationsModule,
        ],
})
export class AppModule { }
