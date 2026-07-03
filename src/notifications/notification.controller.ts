import { Controller, Get, Post, Patch, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const userId = req.user.userId;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const notifications = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec();

    const total = await this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId) });

    return {
      notifications,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notification ID');
    }

    await this.notificationModel.updateOne(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: { read: true } },
    );

    return { message: 'Notification marked as read' };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );

    return { message: 'All notifications marked as read' };
  }

 
}