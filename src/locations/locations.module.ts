import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from '../schemas/location.schema';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
        imports: [
                MongooseModule.forFeature([
                        { name: Location.name, schema: LocationSchema },
                ]),
        ],
        controllers: [LocationsController],
        providers: [LocationsService],
        exports: [LocationsService],
})
export class LocationsModule implements OnModuleInit {
        constructor(private readonly locationsService: LocationsService) { }

        async onModuleInit() {
                console.log('LocationsModule initialized');  // <-- ADD THIS

                // One-time seed if collection is empty
                await this.locationsService.seedIfEmpty();
        }
}
