import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationController } from './notification.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { Notification, NotificationSchema } from '../schemas/notification.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Admin, AdminSchema } from '../schemas/admin.schema';
import { Parcel, ParcelSchema } from '../schemas/parcel.schema';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Parcel.name, schema: ParcelSchema },
    ]),
    forwardRef(() => AlertsModule),
    FirebaseModule
  ],
  controllers: [NotificationController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}