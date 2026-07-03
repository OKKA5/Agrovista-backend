import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { Parcel, ParcelSchema } from '../schemas/parcel.schema';
import { Admin, AdminSchema } from '../schemas/admin.schema';
import { MediaModule } from '../media/media.module';
import { CropsModule } from '../crops/crops.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationsModule } from '../locations/locations.module';
import { UsersModule } from '../users/users.module';

@Module({
        imports: [
                MongooseModule.forFeature([
                        { name: Parcel.name, schema: ParcelSchema },
                        { name: Admin.name, schema: AdminSchema },
                ]),
                MediaModule,
                CropsModule,
                NotificationsModule,
                LocationsModule,
                forwardRef(() => UsersModule)
        ],
        controllers: [ParcelsController],
        providers: [ParcelsService],
        exports: [ParcelsService],
})
export class ParcelsModule { }
