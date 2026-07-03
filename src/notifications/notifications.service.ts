import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Notification,
  NotificationDocument,
} from "../schemas/notification.schema";
import { AlertsService } from "../alerts/alerts.service";
import { FirebaseService } from "../firebase/firebase.service";
import { User, UserDocument } from "../schemas/user.schema";
import { Admin, AdminDocument } from "../schemas/admin.schema";
import { Parcel, ParcelDocument } from "../schemas/parcel.schema";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,

    @Inject(forwardRef(() => AlertsService))
    private alertsService: AlertsService,

    private firebaseService: FirebaseService,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Admin.name)
    private adminModel: Model<AdminDocument>,

    @InjectModel(Parcel.name)
    private parcelModel: Model<ParcelDocument>,
  ) {}

  private async findUserForFcm(userId: string | Types.ObjectId): Promise<{ fcms: { deviceId: string; fcmToken: string }[] } | null> {
    let user = await this.userModel.findById(userId).select("fcms").lean();
    if (user) return user as any;
    let admin = await this.adminModel.findById(userId).select("fcms").lean();
    if (admin) return admin as any;
    return null;
  }
  
  async sendNotification(
    userId: string,
    message: string,
    title: string,
    type: string = "general",
  ) {
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      title,
      message,
      type,
    });

    const user = await this.findUserForFcm(userId);

    const tokens = user?.fcms?.map((d) => d.fcmToken) || [];

    if (tokens.length) {
      await Promise.all(
        tokens.map((token) =>
          this.firebaseService.sendPushNotification(token, title, message),
        ),
      );
    }

    return notification;
  }

  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async sendAlertNotification(alertId: string): Promise<void> {
    const alert = await this.alertsService.findById(alertId);
    if (!alert) return;

    const message = alert.message;

    const parcel = await this.parcelModel.findById(alert.parcelId);
    const userId = parcel?.ownerId;

    if (!userId) {
      console.error(`Cannot find userId for parcel ${alert.parcelId}`);
      return;
    }

    await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      title: `Alert: ${alert.severity.toString()}`,
      message,
      type: "alert", // <-- ADD THIS
      read: false,
    });

    const user = await this.findUserForFcm(userId);

    const tokens = user?.fcms?.map((d) => d.fcmToken) || [];

    if (tokens.length) {
      await Promise.all(
        tokens.map((token) =>
          this.firebaseService.sendPushNotification(token, "Alert", message),
        ),
      );
    }
  }
}
