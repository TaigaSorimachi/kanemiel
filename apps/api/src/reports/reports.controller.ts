import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/summary — 全体サマリ
   */
  @Get('summary')
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.reportsService.getSummary(user.companyId);

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /reports/by-project — 現場別収支
   */
  @Get('by-project')
  async getByProject(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.reportsService.getByProject(user.companyId);

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /reports/cashflow-table — 資金繰り表
   */
  @Get('cashflow-table')
  async getCashflowTable(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.reportsService.getCashflowTable(user.companyId);

    return {
      success: true,
      data,
    };
  }
}
