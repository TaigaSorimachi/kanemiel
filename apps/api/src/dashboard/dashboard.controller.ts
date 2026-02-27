import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard — ダッシュボードデータ一括取得
   */
  @Get()
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.getDashboard(
      user.companyId,
      user.id,
      user.role,
    );

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /dashboard/signals — 3ヶ月シグナル
   */
  @Get('signals')
  async getSignals(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.getSignals(user.companyId);

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /dashboard/chart — 残高推移チャートデータ
   */
  @Get('chart')
  async getChart(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.getChart(user.companyId);

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /dashboard/alerts — アラート一覧
   */
  @Get('alerts')
  async getAlerts(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.getAlerts(user.companyId);

    return {
      success: true,
      data,
    };
  }
}
