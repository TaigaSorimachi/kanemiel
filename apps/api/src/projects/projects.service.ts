import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, userId: string, role: string) {
    const where: Prisma.ProjectWhereInput = { companyId };

    if (role === 'FOREMAN') {
      where.foremanId = userId;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        client: true,
        foreman: true,
        transactions: {
          select: {
            type: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => {
      const incomeTotal = project.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const expenseTotal = project.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const { transactions: _transactions, ...rest } = project;

      return {
        ...rest,
        incomeTotal,
        expenseTotal,
      };
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        foreman: true,
        incomeSchedules: {
          orderBy: { scheduledDate: 'asc' },
        },
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException({
        success: false,
        message: '現場が見つかりません',
      });
    }

    return project;
  }

  async create(companyId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        companyId,
        name: dto.name,
        clientId: dto.clientId,
        contractAmount: dto.contractAmount,
        foremanId: dto.foremanId as string,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        client: true,
        foreman: true,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        message: '現場が見つかりません',
      });
    }

    const data: Prisma.ProjectUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.clientId !== undefined) data.client = { connect: { id: dto.clientId } };
    if (dto.contractAmount !== undefined) data.contractAmount = dto.contractAmount;
    if (dto.foremanId !== undefined) data.foreman = { connect: { id: dto.foremanId } };
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        client: true,
        foreman: true,
      },
    });
  }

  async getTimeline(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({
        success: false,
        message: '現場が見つかりません',
      });
    }

    return this.prisma.transaction.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
      include: {
        client: true,
      },
    });
  }
}
