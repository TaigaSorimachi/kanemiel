import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Signal = 'green' | 'yellow' | 'red';

export interface MonthSignal {
  month: string;
  predictedBalance: number;
  signal: Signal;
}

export interface AlertItem {
  type: 'warning' | 'danger';
  title: string;
  description: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  signal: Signal;
  balance: number;
  contractAmount: number;
  incomeTotal: number;
  expenseTotal: number;
  incomeProgress: number;
}

export interface ChartDataPoint {
  date: string;
  balance: number;
  dangerLine: number;
}

function calculateSignal(balance: number, dangerLine: number): Signal {
  if (balance > dangerLine * 2) return 'green';
  if (balance > dangerLine) return 'yellow';
  return 'red';
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function getMonthRange(offsetMonths: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function formatMonth(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ダッシュボードデータ一括取得
   */
  async getDashboard(companyId: string, userId: string, role: string) {
    if (role === 'FOREMAN') {
      return this.getForemanDashboard(companyId, userId);
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const bankBalance = toNumber(company.bankBalance);
    const dangerLine = toNumber(company.dangerLine);

    const signals = await this.calculateSignals(companyId, bankBalance, dangerLine);
    const alerts = await this.calculateAlerts(companyId, signals);
    const projects = await this.getProjectSummaries(companyId, dangerLine);

    return {
      bankBalance,
      signals,
      alerts,
      projects,
    };
  }

  /**
   * 現場監督用ダッシュボード（担当現場のみ）
   */
  private async getForemanDashboard(companyId: string, userId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dangerLine = toNumber(company.dangerLine);
    const projects = await this.getProjectSummaries(companyId, dangerLine, userId);

    return {
      projects,
    };
  }

  /**
   * 3ヶ月シグナル取得
   */
  async getSignals(companyId: string): Promise<MonthSignal[]> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const bankBalance = toNumber(company.bankBalance);
    const dangerLine = toNumber(company.dangerLine);

    return this.calculateSignals(companyId, bankBalance, dangerLine);
  }

  /**
   * 残高推移チャートデータ取得
   * 過去2ヶ月 + 未来3ヶ月、半月ごとのデータポイント
   */
  async getChart(companyId: string): Promise<ChartDataPoint[]> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const currentBalance = toNumber(company.bankBalance);
    const dangerLine = toNumber(company.dangerLine);

    const now = new Date();
    const dataPoints: ChartDataPoint[] = [];

    // Past 2 months: based on actual transactions
    for (let monthOffset = -2; monthOffset <= -1; monthOffset++) {
      const midDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + monthOffset, 15));
      const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + monthOffset + 1, 0));

      // Get transactions up to mid-month
      const midTransactions = await this.getTransactionBalance(
        companyId,
        new Date(Date.UTC(now.getFullYear(), now.getMonth() + monthOffset, 1)),
        midDate,
      );

      // Get transactions for full month
      const fullTransactions = await this.getTransactionBalance(
        companyId,
        new Date(Date.UTC(now.getFullYear(), now.getMonth() + monthOffset, 1)),
        endDate,
      );

      dataPoints.push({
        date: `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, '0')}-15`,
        balance: currentBalance + midTransactions,
        dangerLine,
      });

      dataPoints.push({
        date: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
        balance: currentBalance + fullTransactions,
        dangerLine,
      });
    }

    // Current month
    const currentMidDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 15));
    const currentEndDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    if (now.getDate() <= 15) {
      dataPoints.push({
        date: `${currentMidDate.getFullYear()}-${String(currentMidDate.getMonth() + 1).padStart(2, '0')}-15`,
        balance: currentBalance,
        dangerLine,
      });
    } else {
      dataPoints.push({
        date: `${currentMidDate.getFullYear()}-${String(currentMidDate.getMonth() + 1).padStart(2, '0')}-15`,
        balance: currentBalance,
        dangerLine,
      });
    }

    // Current month end - based on scheduled
    const currentMonthIncome = await this.getScheduledIncome(companyId, { start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)), end: currentEndDate });
    const currentMonthExpense = await this.getApprovedExpenses(companyId, { start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)), end: currentEndDate });

    dataPoints.push({
      date: `${currentEndDate.getFullYear()}-${String(currentEndDate.getMonth() + 1).padStart(2, '0')}-${String(currentEndDate.getDate()).padStart(2, '0')}`,
      balance: currentBalance + currentMonthIncome - currentMonthExpense,
      dangerLine,
    });

    // Future 3 months: based on scheduled incomes and approved expenses
    let runningBalance = currentBalance + currentMonthIncome - currentMonthExpense;

    for (let monthOffset = 1; monthOffset <= 3; monthOffset++) {
      const range = getMonthRange(monthOffset);
      const midRange = {
        start: range.start,
        end: new Date(Date.UTC(range.start.getFullYear(), range.start.getMonth(), 15)),
      };
      const lateRange = {
        start: new Date(Date.UTC(range.start.getFullYear(), range.start.getMonth(), 16)),
        end: range.end,
      };

      const midIncome = await this.getScheduledIncome(companyId, midRange);
      const midExpense = await this.getApprovedExpenses(companyId, midRange);
      const lateIncome = await this.getScheduledIncome(companyId, lateRange);
      const lateExpense = await this.getApprovedExpenses(companyId, lateRange);

      const midBalance = runningBalance + midIncome - midExpense;
      const endBalance = midBalance + lateIncome - lateExpense;

      const midDate = new Date(Date.UTC(range.start.getFullYear(), range.start.getMonth(), 15));
      const endDate = new Date(Date.UTC(range.start.getFullYear(), range.start.getMonth() + 1, 0));

      dataPoints.push({
        date: `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, '0')}-15`,
        balance: midBalance,
        dangerLine,
      });

      dataPoints.push({
        date: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
        balance: endBalance,
        dangerLine,
      });

      runningBalance = endBalance;
    }

    return dataPoints;
  }

  /**
   * アラート一覧取得
   */
  async getAlerts(companyId: string): Promise<AlertItem[]> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const bankBalance = toNumber(company.bankBalance);
    const dangerLine = toNumber(company.dangerLine);
    const signals = await this.calculateSignals(companyId, bankBalance, dangerLine);

    return this.calculateAlerts(companyId, signals);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 3ヶ月分のシグナルを計算
   */
  private async calculateSignals(
    companyId: string,
    currentBalance: number,
    dangerLine: number,
  ): Promise<MonthSignal[]> {
    const signals: MonthSignal[] = [];
    let runningBalance = currentBalance;

    for (let offset = 0; offset < 3; offset++) {
      const range = getMonthRange(offset);

      const income = await this.getScheduledIncome(companyId, range);
      const expenses = await this.getApprovedAndPendingExpenses(companyId, range);

      const predictedBalance = runningBalance + income - expenses;
      const signal = calculateSignal(predictedBalance, dangerLine);

      signals.push({
        month: formatMonth(offset),
        predictedBalance,
        signal,
      });

      runningBalance = predictedBalance;
    }

    return signals;
  }

  /**
   * アラートを計算
   */
  private async calculateAlerts(
    companyId: string,
    signals: MonthSignal[],
  ): Promise<AlertItem[]> {
    const alerts: AlertItem[] = [];

    // Pending payment requests
    const pendingRequests = await this.prisma.paymentRequest.count({
      where: {
        project: { companyId },
        status: 'PENDING',
      },
    });

    if (pendingRequests > 0) {
      const pendingTotal = await this.prisma.paymentRequest.aggregate({
        where: {
          project: { companyId },
          status: 'PENDING',
        },
        _sum: { amount: true },
      });

      alerts.push({
        type: 'warning',
        title: '承認待ち支払申請',
        description: `${pendingRequests}件の支払申請が承認待ちです（合計${toNumber(pendingTotal._sum.amount).toLocaleString()}円）`,
      });
    }

    // Overdue income schedules
    const overdueSchedules = await this.prisma.incomeSchedule.findMany({
      where: {
        project: { companyId },
        status: 'OVERDUE',
      },
      include: { project: true },
    });

    if (overdueSchedules.length > 0) {
      for (const schedule of overdueSchedules) {
        alerts.push({
          type: 'danger',
          title: '入金遅延',
          description: `${schedule.project.name}の入金（${toNumber(schedule.amount).toLocaleString()}円）が予定日を過ぎています`,
        });
      }
    }

    // Red signal months
    for (const signal of signals) {
      if (signal.signal === 'red') {
        alerts.push({
          type: 'danger',
          title: '資金不足予測',
          description: `${signal.month}の予測残高が危険ラインを下回っています（${signal.predictedBalance.toLocaleString()}円）`,
        });
      }
    }

    return alerts;
  }

  /**
   * プロジェクトサマリー取得
   */
  private async getProjectSummaries(
    companyId: string,
    dangerLine: number,
    foremanId?: string,
  ): Promise<ProjectSummary[]> {
    const where: Prisma.ProjectWhereInput = {
      companyId,
      status: 'ACTIVE',
    };

    if (foremanId) {
      where.foremanId = foremanId;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        incomeSchedules: {
          where: { status: 'RECEIVED' },
        },
        transactions: true,
      },
    });

    return projects.map((project) => {
      const incomeTotal = project.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const expenseTotal = project.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const balance = incomeTotal - expenseTotal;
      const contractAmount = toNumber(project.contractAmount);
      const incomeProgress = contractAmount > 0 ? incomeTotal / contractAmount : 0;
      const signal = calculateSignal(balance, dangerLine);

      return {
        id: project.id,
        name: project.name,
        signal,
        balance,
        contractAmount,
        incomeTotal,
        expenseTotal,
        incomeProgress,
      };
    });
  }

  /**
   * 指定期間のスケジュール入金合計を取得
   */
  private async getScheduledIncome(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<number> {
    const result = await this.prisma.incomeSchedule.aggregate({
      where: {
        project: { companyId },
        scheduledDate: {
          gte: range.start,
          lte: range.end,
        },
        status: { in: ['SCHEDULED', 'RECEIVED'] },
      },
      _sum: { amount: true },
    });

    return toNumber(result._sum.amount);
  }

  /**
   * 指定期間の承認済み＋保留中の支出合計を取得（シグナル計算用）
   */
  private async getApprovedAndPendingExpenses(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<number> {
    const result = await this.prisma.paymentRequest.aggregate({
      where: {
        project: { companyId },
        desiredDate: {
          gte: range.start,
          lte: range.end,
        },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      _sum: { amount: true },
    });

    return toNumber(result._sum.amount);
  }

  /**
   * 指定期間の承認済み支出合計を取得（チャート用）
   */
  private async getApprovedExpenses(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<number> {
    const result = await this.prisma.paymentRequest.aggregate({
      where: {
        project: { companyId },
        desiredDate: {
          gte: range.start,
          lte: range.end,
        },
        status: 'APPROVED',
      },
      _sum: { amount: true },
    });

    return toNumber(result._sum.amount);
  }

  /**
   * 指定期間の実績トランザクション残高変動を取得（過去チャート用）
   */
  private async getTransactionBalance(
    companyId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const incomeResult = await this.prisma.transaction.aggregate({
      where: {
        project: { companyId },
        type: 'INCOME',
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const expenseResult = await this.prisma.transaction.aggregate({
      where: {
        project: { companyId },
        type: 'EXPENSE',
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    return toNumber(incomeResult._sum.amount) - toNumber(expenseResult._sum.amount);
  }
}
