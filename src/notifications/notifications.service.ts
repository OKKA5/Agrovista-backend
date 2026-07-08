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

interface FcmDevice {
  deviceId: string;
  fcmToken: string;
}

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
  
  private async sendToTokens(
    userId: string,
    fcms: FcmDevice[],
    title: string,
    body: string,
  ) {
    const results = await Promise.allSettled(
      fcms.map((d) =>
        this.firebaseService.sendPushNotification(d.fcmToken, title, body),
      ),
    );

    const invalidTokens: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const err: any = r.reason;
        if (
          err?.code === "messaging/registration-token-not-registered" ||
          err?.errorInfo?.code ===
            "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(fcms[i].fcmToken);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await this.userModel
        .updateOne(
          { _id: userId },
          { $pull: { fcms: { fcmToken: { $in: invalidTokens } } } },
        )
        .exec();
      await this.adminModel
        .updateOne(
          { _id: userId },
          { $pull: { fcms: { fcmToken: { $in: invalidTokens } } } },
        )
        .exec();
    }
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

    const fcms = user?.fcms || [];

    if (fcms.length) {
      await this.sendToTokens(userId, fcms, title, message);
    }

    return notification;
  }

  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async sendAlertNotificationForParcel(parcelId: string, alerts: any[]): Promise<void> {
    if (!alerts.length) return;

    const parcel = await this.parcelModel.findById(parcelId);
    const userId = parcel?.ownerId;

    if (!userId) {
      console.error(`Cannot find userId for parcel ${parcelId}`);
      return;
    }

    const messages = alerts.map((a) => a.message).join("\n");

    const title = `Alert: ${alerts.length} issue${alerts.length > 1 ? "s" : ""} detected`;
    const message = `${alerts.length} alert${alerts.length > 1 ? "s" : ""} on your parcel:\n${messages}`;

    await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      title,
      message,
      type: "alert",
      read: false,
    });

    const user = await this.findUserForFcm(userId);
    const fcms = user?.fcms || [];

    if (fcms.length) {
      await this.sendToTokens(userId.toString(), fcms, title, message);
    }
  }
}
