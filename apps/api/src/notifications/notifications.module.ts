import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { LineNotificationService } from './line-notification.service.js';
import { NotificationCronService } from './notification-cron.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, LineNotificationService, NotificationCronService],
  exports: [NotificationsService, LineNotificationService],
})
export class NotificationsModule {}
