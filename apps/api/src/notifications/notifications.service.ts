import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async create(data: {
    userId: string;
    type: 'APPROVAL_REQUEST' | 'DANGER_ALERT' | 'DAILY_SUMMARY' | 'OVERDUE';
    title: string;
    message: string;
    linkUrl?: string;
  }) {
    return this.prisma.notification.create({ data });
  }
}
