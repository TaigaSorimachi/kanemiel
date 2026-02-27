import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto.js';

type SignalColor = 'green' | 'yellow' | 'red';

function calculateSignal(balance: number, dangerLine: number): SignalColor {
  if (balance > dangerLine * 2) return 'green';
  if (balance > dangerLine) return 'yellow';
  return 'red';
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 支払申請を作成する
   */
  async create(requesterId: string, dto: CreatePaymentRequestDto) {
    const paymentRequest = await this.prisma.paymentRequest.create({
      data: {
        projectId: dto.projectId,
        requesterId,
        clientId: dto.clientId,
        amount: new Prisma.Decimal(dto.amount),
        category: dto.category,
        desiredDate: new Date(dto.desiredDate),
        status: 'PENDING',
        note: dto.note ?? null,
        photoUrl: dto.photoUrl ?? null,
      },
      include: {
        project: { include: { company: true } },
        requester: true,
        client: true,
      },
    });

    // Create in-app notification for owner/accounting users
    const approvers = await this.prisma.user.findMany({
      where: {
        companyId: paymentRequest.project.companyId,
        role: { in: ['OWNER', 'ACCOUNTING'] },
      },
    });

    const formatYen = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;
    const amount = Number(paymentRequest.amount);

    for (const approver of approvers) {
      await this.prisma.notification.create({
        data: {
          userId: approver.id,
          type: 'APPROVAL_REQUEST',
          title: '支払い承認依頼',
          message: `${paymentRequest.project.name} → ${paymentRequest.client.name}（${formatYen(amount)}円）の承認をお願いします`,
          linkUrl: `/payments/${paymentRequest.id}`,
        },
      });
    }

    return paymentRequest;
  }

  /**
   * 会社の未承認の支払申請を取得する
   */
  async findPending(companyId: string) {
    const requests = await this.prisma.paymentRequest.findMany({
      where: {
        status: 'PENDING',
        project: {
          companyId,
        },
      },
      include: {
        project: true,
        requester: true,
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * 会社の支払申請一覧を取得する（現場フィルタ可）
   */
  async findAll(companyId: string, projectId?: string) {
    const where: Prisma.PaymentRequestWhereInput = {
      project: {
        companyId,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const requests = await this.prisma.paymentRequest.findMany({
      where,
      include: {
        project: true,
        requester: true,
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * 支払申請を承認する
   */
  async approve(requestId: string, approverId: string) {
    const existing = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        message: '支払申請が見つかりません',
      });
    }

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
        include: {
          project: true,
          requester: true,
          client: true,
        },
      }),
      this.prisma.approvalLog.create({
        data: {
          requestId,
          approverId,
          action: 'APPROVED',
        },
      }),
    ]);

    return updatedRequest;
  }

  /**
   * 支払申請を却下する
   */
  async reject(requestId: string, approverId: string, comment?: string) {
    const existing = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        message: '支払申請が見つかりません',
      });
    }

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
        include: {
          project: true,
          requester: true,
          client: true,
        },
      }),
      this.prisma.approvalLog.create({
        data: {
          requestId,
          approverId,
          action: 'REJECTED',
          comment: comment ?? null,
        },
      }),
    ]);

    return updatedRequest;
  }

  /**
   * 支払申請の影響度プレビューを取得する
   */
  async getImpact(requestId: string) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: {
        project: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException({
        success: false,
        message: '支払申請が見つかりません',
      });
    }

    // 現場の入金合計を算出
    const incomeAgg = await this.prisma.transaction.aggregate({
      where: {
        projectId: request.projectId,
        type: 'INCOME',
      },
      _sum: {
        amount: true,
      },
    });

    // 現場の支出合計を算出
    const expenseAgg = await this.prisma.transaction.aggregate({
      where: {
        projectId: request.projectId,
        type: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);
    const requestAmount = Number(request.amount);
    const companyBankBalance = Number(request.project.company.bankBalance);
    const dangerLine = Number(request.project.company.dangerLine);

    const projectBalanceAfter = totalIncome - totalExpense - requestAmount;
    const companyBalanceAfter = companyBankBalance - requestAmount;

    const projectSignalAfter = calculateSignal(projectBalanceAfter, dangerLine);
    const companySignalAfter = calculateSignal(companyBalanceAfter, dangerLine);

    return {
      projectBalanceAfter,
      projectSignalAfter,
      companyBalanceAfter,
      companySignalAfter,
    };
  }
}
