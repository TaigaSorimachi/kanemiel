import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { LineNotificationService } from './line-notification.service.js';

@Injectable()
export class NotificationCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lineNotification: LineNotificationService,
  ) {}

  // Daily summary at 8:00 AM JST (23:00 UTC previous day)
  @Cron('0 23 * * *')
  async sendDailySummaries() {
    // Get all companies
    const companies = await this.prisma.company.findMany();
    for (const company of companies) {
      // Get users with notifications enabled (owner + accounting)
      const users = await this.prisma.user.findMany({
        where: {
          companyId: company.id,
          lineNotification: true,
          role: { in: ['OWNER', 'ACCOUNTING'] },
        },
      });

      if (users.length === 0) continue;

      // Calculate summary data
      const bankBalance = Number(company.bankBalance);
      const dangerLine = Number(company.dangerLine);
      const signal = bankBalance > dangerLine * 2 ? 'green' : bankBalance > dangerLine ? 'yellow' : 'red';

      const pending = await this.prisma.paymentRequest.aggregate({
        where: { project: { companyId: company.id }, status: 'PENDING' },
        _count: true,
        _sum: { amount: true },
      });

      // Send to each user
      for (const user of users) {
        try {
          await this.lineNotification.sendDailySummary(user.lineUserId, {
            bankBalance,
            signal,
            pendingCount: pending._count,
            pendingAmount: Number(pending._sum.amount || 0),
            weeklyExpense: 0, // Simplified
            weeklyIncome: 0,
          });
        } catch (e) {
          console.error(`Failed to send daily summary to ${user.name}:`, e);
        }
      }
    }
  }

  // Check overdue income schedules at 9:00 AM JST (00:00 UTC)
  @Cron('0 0 * * *')
  async checkOverdueIncomes() {
    const today = new Date();
    // Find scheduled incomes past due date
    const overdueSchedules = await this.prisma.incomeSchedule.findMany({
      where: {
        scheduledDate: { lt: today },
        status: 'SCHEDULED',
      },
      include: {
        project: { include: { company: true } },
      },
    });

    // Update to OVERDUE
    for (const schedule of overdueSchedules) {
      await this.prisma.incomeSchedule.update({
        where: { id: schedule.id },
        data: { status: 'OVERDUE' },
      });

      // Create notification for owner/accounting
      const users = await this.prisma.user.findMany({
        where: {
          companyId: schedule.project.companyId,
          role: { in: ['OWNER', 'ACCOUNTING'] },
          lineNotification: true,
        },
      });

      for (const user of users) {
        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'OVERDUE',
            title: '入金遅延',
            message: `${schedule.project.name}の入金（${Number(schedule.amount).toLocaleString()}円）が予定日を過ぎています`,
            linkUrl: `/`,
          },
        });
      }
    }
  }
}
