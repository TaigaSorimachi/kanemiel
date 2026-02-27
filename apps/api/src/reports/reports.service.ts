import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Signal = 'green' | 'yellow' | 'red';

export interface MonthlySummary {
  incomeTotal: number;
  expenseTotal: number;
  netIncome: number;
  pendingApprovalCount: number;
  pendingApprovalAmount: number;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface ProjectHealthItem {
  projectId: string;
  projectName: string;
  healthPercent: number;
  signal: Signal;
}

export interface ProjectFinancial {
  projectId: string;
  projectName: string;
  contractAmount: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  status: Signal;
  expenseByCategory: {
    subcontracting: number;
    material: number;
    equipment: number;
    transport: number;
    other: number;
  };
}

export interface CashflowMonth {
  month: string;
  openingBalance: number;
  income: {
    generalContractor: number;
    other: number;
    total: number;
  };
  expense: {
    subcontracting: number;
    material: number;
    other: number;
    total: number;
  };
  closingBalance: number;
  signal: Signal;
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
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全体サマリ取得
   */
  async getSummary(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dangerLine = toNumber(company.dangerLine);

    const currentMonth = await this.getCurrentMonthSummary(companyId);
    const monthlyTrend = await this.getMonthlyTrend(companyId);
    const projectHealth = await this.getProjectHealth(companyId, dangerLine);

    return {
      currentMonth,
      monthlyTrend,
      projectHealth,
    };
  }

  /**
   * 現場別収支取得
   */
  async getByProject(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dangerLine = toNumber(company.dangerLine);

    const projects = await this.prisma.project.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        transactions: true,
        paymentRequests: {
          where: { status: { in: ['APPROVED', 'PAID'] } },
        },
      },
    });

    const projectFinancials: ProjectFinancial[] = projects.map((project) => {
      const incomeTotal = project.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const expenseTotal = project.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const contractAmount = toNumber(project.contractAmount);
      const balance = incomeTotal - expenseTotal;
      const status = calculateSignal(balance, dangerLine);

      // Calculate expense by category from payment requests
      const expenseByCategory = {
        subcontracting: 0,
        material: 0,
        equipment: 0,
        transport: 0,
        other: 0,
      };

      for (const request of project.paymentRequests) {
        const amount = toNumber(request.amount);
        switch (request.category) {
          case 'SUBCONTRACTING':
            expenseByCategory.subcontracting += amount;
            break;
          case 'MATERIAL':
            expenseByCategory.material += amount;
            break;
          case 'EQUIPMENT':
            expenseByCategory.equipment += amount;
            break;
          case 'TRANSPORT':
            expenseByCategory.transport += amount;
            break;
          case 'OTHER':
            expenseByCategory.other += amount;
            break;
        }
      }

      return {
        projectId: project.id,
        projectName: project.name,
        contractAmount,
        incomeTotal,
        expenseTotal,
        balance,
        status,
        expenseByCategory,
      };
    });

    // Calculate totals row
    const totals = {
      contractAmount: projectFinancials.reduce((sum, p) => sum + p.contractAmount, 0),
      incomeTotal: projectFinancials.reduce((sum, p) => sum + p.incomeTotal, 0),
      expenseTotal: projectFinancials.reduce((sum, p) => sum + p.expenseTotal, 0),
      balance: projectFinancials.reduce((sum, p) => sum + p.balance, 0),
      expenseByCategory: {
        subcontracting: projectFinancials.reduce((sum, p) => sum + p.expenseByCategory.subcontracting, 0),
        material: projectFinancials.reduce((sum, p) => sum + p.expenseByCategory.material, 0),
        equipment: projectFinancials.reduce((sum, p) => sum + p.expenseByCategory.equipment, 0),
        transport: projectFinancials.reduce((sum, p) => sum + p.expenseByCategory.transport, 0),
        other: projectFinancials.reduce((sum, p) => sum + p.expenseByCategory.other, 0),
      },
    };

    return {
      projects: projectFinancials,
      totals,
    };
  }

  /**
   * 資金繰り表取得（今月 + 3ヶ月）
   */
  async getCashflowTable(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dangerLine = toNumber(company.dangerLine);
    let openingBalance = toNumber(company.bankBalance);

    const months: CashflowMonth[] = [];
    const dangerAlerts: string[] = [];

    for (let offset = 0; offset < 4; offset++) {
      const range = getMonthRange(offset);
      const monthLabel = formatMonth(offset);

      // Income: general contractor vs other
      const incomeSchedules = await this.prisma.incomeSchedule.findMany({
        where: {
          project: { companyId },
          scheduledDate: {
            gte: range.start,
            lte: range.end,
          },
          status: { in: ['SCHEDULED', 'RECEIVED'] },
        },
        include: {
          client: true,
        },
      });

      let generalContractorIncome = 0;
      let otherIncome = 0;

      for (const schedule of incomeSchedules) {
        const amount = toNumber(schedule.amount);
        if (schedule.client.type === 'GENERAL_CONTRACTOR') {
          generalContractorIncome += amount;
        } else {
          otherIncome += amount;
        }
      }

      const incomeTotal = generalContractorIncome + otherIncome;

      // Expense: by category
      const paymentRequests = await this.prisma.paymentRequest.findMany({
        where: {
          project: { companyId },
          desiredDate: {
            gte: range.start,
            lte: range.end,
          },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      let subcontractingExpense = 0;
      let materialExpense = 0;
      let otherExpense = 0;

      for (const request of paymentRequests) {
        const amount = toNumber(request.amount);
        switch (request.category) {
          case 'SUBCONTRACTING':
            subcontractingExpense += amount;
            break;
          case 'MATERIAL':
            materialExpense += amount;
            break;
          case 'EQUIPMENT':
          case 'TRANSPORT':
          case 'OTHER':
            otherExpense += amount;
            break;
        }
      }

      const expenseTotal = subcontractingExpense + materialExpense + otherExpense;
      const closingBalance = openingBalance + incomeTotal - expenseTotal;
      const signal = calculateSignal(closingBalance, dangerLine);

      if (signal === 'red') {
        dangerAlerts.push(`${monthLabel}の月末残高が危険ラインを下回る見込みです（${closingBalance.toLocaleString()}円）`);
      }

      months.push({
        month: monthLabel,
        openingBalance,
        income: {
          generalContractor: generalContractorIncome,
          other: otherIncome,
          total: incomeTotal,
        },
        expense: {
          subcontracting: subcontractingExpense,
          material: materialExpense,
          other: otherExpense,
          total: expenseTotal,
        },
        closingBalance,
        signal,
      });

      openingBalance = closingBalance;
    }

    return {
      months,
      dangerAlerts,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 今月のサマリーを取得
   */
  private async getCurrentMonthSummary(companyId: string): Promise<MonthlySummary> {
    const range = getMonthRange(0);

    // Income total from transactions this month
    const incomeResult = await this.prisma.transaction.aggregate({
      where: {
        project: { companyId },
        type: 'INCOME',
        date: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    // Expense total from transactions this month
    const expenseResult = await this.prisma.transaction.aggregate({
      where: {
        project: { companyId },
        type: 'EXPENSE',
        date: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    const incomeTotal = toNumber(incomeResult._sum.amount);
    const expenseTotal = toNumber(expenseResult._sum.amount);

    // Pending approvals
    const pendingApproval = await this.prisma.paymentRequest.aggregate({
      where: {
        project: { companyId },
        status: 'PENDING',
      },
      _count: true,
      _sum: { amount: true },
    });

    return {
      incomeTotal,
      expenseTotal,
      netIncome: incomeTotal - expenseTotal,
      pendingApprovalCount: pendingApproval._count,
      pendingApprovalAmount: toNumber(pendingApproval._sum.amount),
    };
  }

  /**
   * 過去5ヶ月の月別推移を取得
   */
  private async getMonthlyTrend(companyId: string): Promise<MonthlyTrendItem[]> {
    const trend: MonthlyTrendItem[] = [];

    for (let offset = -4; offset <= 0; offset++) {
      const range = getMonthRange(offset);
      const monthLabel = formatMonth(offset);

      const incomeResult = await this.prisma.transaction.aggregate({
        where: {
          project: { companyId },
          type: 'INCOME',
          date: { gte: range.start, lte: range.end },
        },
        _sum: { amount: true },
      });

      const expenseResult = await this.prisma.transaction.aggregate({
        where: {
          project: { companyId },
          type: 'EXPENSE',
          date: { gte: range.start, lte: range.end },
        },
        _sum: { amount: true },
      });

      const income = toNumber(incomeResult._sum.amount);
      const expense = toNumber(expenseResult._sum.amount);

      trend.push({
        month: monthLabel,
        income,
        expense,
        net: income - expense,
      });
    }

    return trend;
  }

  /**
   * 現場別健全度を取得
   */
  private async getProjectHealth(
    companyId: string,
    dangerLine: number,
  ): Promise<ProjectHealthItem[]> {
    const projects = await this.prisma.project.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
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

      const contractAmount = toNumber(project.contractAmount);
      const healthPercent = contractAmount > 0 ? incomeTotal / contractAmount : 0;
      const balance = incomeTotal - expenseTotal;
      const signal = calculateSignal(balance, dangerLine);

      return {
        projectId: project.id,
        projectName: project.name,
        healthPercent,
        signal,
      };
    });
  }
}
