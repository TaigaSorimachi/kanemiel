import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';
import { CreateIncomeScheduleDto } from './dto/create-income-schedule.dto.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 入金を登録する
   * 一致する入金予定があれば、ステータスをRECEIVEDに更新する
   */
  async registerIncome(dto: CreateIncomeDto) {
    const transactionDate = dto.date ? new Date(dto.date) : new Date();

    const transaction = await this.prisma.transaction.create({
      data: {
        projectId: dto.projectId,
        type: 'INCOME',
        amount: new Prisma.Decimal(dto.amount),
        date: transactionDate,
        category: dto.incomeType ?? 'PROGRESS',
        clientId: dto.clientId,
        description: dto.description ?? null,
      },
      include: {
        project: true,
        client: true,
      },
    });

    // 一致する入金予定を検索して更新する
    // 同じ現場・類似金額・SCHEDULEDステータスのもの
    const matchingSchedule = await this.prisma.incomeSchedule.findFirst({
      where: {
        projectId: dto.projectId,
        status: 'SCHEDULED',
        amount: new Prisma.Decimal(dto.amount),
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    if (matchingSchedule) {
      await this.prisma.incomeSchedule.update({
        where: { id: matchingSchedule.id },
        data: {
          status: 'RECEIVED',
          actualDate: transactionDate,
        },
      });
    }

    return transaction;
  }

  /**
   * 入出金一覧を取得する（フィルタ可）
   */
  async findAll(
    companyId: string,
    projectId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.TransactionWhereInput = {
      project: {
        companyId,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Prisma.DateTimeFilter).gte = startDate;
      }
      if (endDate) {
        (where.date as Prisma.DateTimeFilter).lte = endDate;
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        project: true,
        client: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return transactions;
  }

  /**
   * 入金予定一覧を取得する
   */
  async findIncomeSchedules(companyId: string) {
    const schedules = await this.prisma.incomeSchedule.findMany({
      where: {
        project: {
          companyId,
        },
      },
      include: {
        project: true,
        client: true,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return schedules;
  }

  /**
   * 入金予定を作成する
   */
  async createIncomeSchedule(dto: CreateIncomeScheduleDto) {
    const schedule = await this.prisma.incomeSchedule.create({
      data: {
        projectId: dto.projectId,
        clientId: dto.clientId,
        amount: new Prisma.Decimal(dto.amount),
        scheduledDate: new Date(dto.scheduledDate),
        incomeType: dto.incomeType,
        status: 'SCHEDULED',
      },
      include: {
        project: true,
        client: true,
      },
    });

    return schedule;
  }
}
