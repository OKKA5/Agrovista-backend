import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

@Injectable()
export class MqttListenerService implements OnModuleInit, OnModuleDestroy {
        private readonly logger = new Logger(MqttListenerService.name);
        private client: mqtt.MqttClient;

        constructor(
                private readonly configService: ConfigService,
                private readonly telemetryService: TelemetryService,
        ) { }

        onModuleInit() {
                this.connect();
        }

        onModuleDestroy() {
                this.client?.end(true);
        }

        private connect() {
                const url = this.configService.getOrThrow<string>('MQTT_URL');
                const username = this.configService.getOrThrow<string>('MQTT_USERNAME');
                const password = this.configService.getOrThrow<string>('MQTT_PASSWORD');

                this.client = mqtt.connect(url, {
                        username,
                        password,
                        reconnectPeriod: 5000,
                        connectTimeout: 30000,
                        rejectUnauthorized: false,
                        protocolVersion: 4,        
                        clean: true,
                        keepalive: 60,
                });

                this.client.on('connect', () => {
                        this.logger.log('MQTT connected to HiveMQ');
                        this.client.subscribe('parcels/+/sensors/esp32', (err) => {
                                if (err) {
                                        this.logger.error('MQTT subscribe failed', err);
                                } else {
                                        this.logger.log('Subscribed to parcels/+/sensors/esp32');
                                }
                        });
                });

                this.client.on('message', (topic, payload) => {
                        this.handleMessage(topic, payload).catch((err) => {
                                this.logger.error(`Failed to process message from ${topic}: ${err.message}`);
                        });
                });

                this.client.on('error', (err) => {
                        this.logger.error('MQTT connection error', err.message);
                });

                this.client.on('close', () => {
                        this.logger.warn('MQTT disconnected, will reconnect automatically...');
                        // reconnectPeriod handles this, no manual action needed
                });

                this.client.on('reconnect', () => {
                        this.logger.log('MQTT reconnecting...');
                });
        }

        private async handleMessage(topic: string, payload: Buffer) {
                const match = topic.match(/^parcels\/([^/]+)\/sensors\/esp32$/);
                if (!match) return;

                const parcelId = match[1];
                const raw = JSON.parse(payload.toString());

                const dto: CreateTelemetryDto = {
                        parcelId,
                        source: raw.source || 'esp32',
                        timestamp: raw.timestamp || new Date().toISOString(),
                        soilNitrogen: raw.soilNitrogen,
                        soilPhosphorus: raw.soilPhosphorus,
                        soilPotassium: raw.soilPotassium,
                        soilPh: raw.soilPh,
                        temperature: raw.temperature,
                        humidity: raw.humidity,
                        soilMoisture: raw.soilMoisture,
                };

                await this.telemetryService.create(dto);
                this.logger.debug(`Ingested parcel ${parcelId} from ESP32`);
        }
}
