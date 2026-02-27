import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto.js';
import { RejectPaymentDto } from './dto/reject-payment.dto.js';

@Controller('payment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payment-requests
   * 支払申請を作成する
   */
  @Post()
  @Roles('accounting', 'foreman')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentRequestDto,
  ) {
    const data = await this.paymentsService.create(user.id, dto);
    return { success: true, data, message: '支払申請を作成しました' };
  }

  /**
   * GET /payment-requests
   * 支払申請一覧を取得する
   */
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.paymentsService.findAll(user.companyId, projectId);
    return { success: true, data };
  }

  /**
   * GET /payment-requests/pending
   * 未承認の支払申請一覧を取得する
   */
  @Get('pending')
  @Roles('owner', 'accounting')
  async findPending(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.paymentsService.findPending(user.companyId);
    return { success: true, data };
  }

  /**
   * POST /payment-requests/:id/approve
   * 支払申請を承認する
   */
  @Post(':id/approve')
  @Roles('owner', 'accounting')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.paymentsService.approve(id, user.id);
    return { success: true, data, message: '支払申請を承認しました' };
  }

  /**
   * POST /payment-requests/:id/reject
   * 支払申請を却下する
   */
  @Post(':id/reject')
  @Roles('owner', 'accounting')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RejectPaymentDto,
  ) {
    const data = await this.paymentsService.reject(id, user.id, dto.comment);
    return { success: true, data, message: '支払申請を却下しました' };
  }

  /**
   * GET /payment-requests/:id/impact
   * 支払申請の影響度プレビューを取得する
   */
  @Get(':id/impact')
  async getImpact(@Param('id') id: string) {
    const data = await this.paymentsService.getImpact(id);
    return { success: true, data };
  }
}
