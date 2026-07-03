import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { LocationsModule } from '../locations/locations.module';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
        imports: [
                AuthModule,
                LocationsModule,
                forwardRef(() => ParcelsModule)
        ],
        controllers: [UsersController],
        providers: [UsersService],
        exports: [UsersService],
})
export class UsersModule { }
