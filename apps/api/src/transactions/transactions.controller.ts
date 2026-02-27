import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';
import { CreateIncomeScheduleDto } from './dto/create-income-schedule.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * POST /transactions/income
   * 入金を登録する
   */
  @Post('transactions/income')
  @Roles('accounting')
  async registerIncome(@Body() dto: CreateIncomeDto) {
    const data = await this.transactionsService.registerIncome(dto);
    return { success: true, data, message: '入金を登録しました' };
  }

  /**
   * GET /transactions
   * 入出金一覧を取得する
   */
  @Get('transactions')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const data = await this.transactionsService.findAll(
      user.companyId,
      projectId,
      start,
      end,
    );
    return { success: true, data };
  }

  /**
   * GET /income-schedules
   * 入金予定一覧を取得する
   */
  @Get('income-schedules')
  async findIncomeSchedules(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.transactionsService.findIncomeSchedules(user.companyId);
    return { success: true, data };
  }

  /**
   * POST /income-schedules
   * 入金予定を作成する
   */
  @Post('income-schedules')
  @Roles('accounting')
  async createIncomeSchedule(@Body() dto: CreateIncomeScheduleDto) {
    const data = await this.transactionsService.createIncomeSchedule(dto);
    return { success: true, data, message: '入金予定を作成しました' };
  }
}
