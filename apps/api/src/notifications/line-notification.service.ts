import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';

@Injectable()
export class LineNotificationService {
  private client: messagingApi.MessagingApiClient | null = null;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (token) {
      this.client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
    }
  }

  // Push text message to a user
  async pushMessage(lineUserId: string, message: string): Promise<void> {
    if (!this.client) return;
    await this.client.pushMessage({
      to: lineUserId,
      messages: [{ type: 'text', text: message }],
    });
  }

  // Send approval request notification
  async sendApprovalRequest(lineUserId: string, data: {
    projectName: string; clientName: string; amount: number;
    category: string; requesterName: string;
    projectBalanceAfter: number; projectSignal: string;
    companyBalanceAfter: number; companySignal: string;
  }): Promise<void> {
    // Build the message
    const signalEmoji = (s: string) => s === 'green' ? '🟢' : s === 'yellow' ? '🟡' : '🔴';
    const formatYen = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;
    const msg = [
      '━━━━━━━━━━━━━',
      '🔔 支払い承認のお願い',
      '━━━━━━━━━━━━━',
      `${data.projectName} → ${data.clientName}`,
      `金額：${formatYen(data.amount)}円（${data.category}）`,
      `申請者：${data.requesterName}`,
      '',
      '承認後の残高：',
      `  ${data.projectName}：${formatYen(data.projectBalanceAfter)}${signalEmoji(data.projectSignal)}`,
      `  会社全体：${formatYen(data.companyBalanceAfter)}${signalEmoji(data.companySignal)}`,
      '━━━━━━━━━━━━━',
    ].join('\n');
    await this.pushMessage(lineUserId, msg);
  }

  // Send daily summary
  async sendDailySummary(lineUserId: string, data: {
    bankBalance: number; signal: string; pendingCount: number;
    pendingAmount: number; weeklyExpense: number; weeklyIncome: number;
  }): Promise<void> {
    const signalEmoji = (s: string) => s === 'green' ? '🟢' : s === 'yellow' ? '🟡' : '🔴';
    const formatYen = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;
    const msg = [
      '━━━━━━━━━━━━━',
      '📊 本日の資金状況',
      '━━━━━━━━━━━━━',
      `会社残高：${formatYen(data.bankBalance)}円 ${signalEmoji(data.signal)}`,
      `承認待ち：${data.pendingCount}件（合計${formatYen(data.pendingAmount)}円）`,
      `今週の支払予定：${formatYen(data.weeklyExpense)}円`,
      `今週の入金予定：${formatYen(data.weeklyIncome)}円`,
      '━━━━━━━━━━━━━',
    ].join('\n');
    await this.pushMessage(lineUserId, msg);
  }

  // Send danger alert
  async sendDangerAlert(lineUserId: string, data: {
    month: string; predictedBalance: number; projectNames: string[];
  }): Promise<void> {
    const formatYen = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;
    const msg = [
      '━━━━━━━━━━━━━',
      '🔴 資金アラート',
      '━━━━━━━━━━━━━',
      `${data.month}時点で`,
      `残高が ${formatYen(data.predictedBalance)}円 になる`,
      '見込みです。',
      '',
      `対象現場：${data.projectNames.join('、')}`,
      '━━━━━━━━━━━━━',
    ].join('\n');
    await this.pushMessage(lineUserId, msg);
  }
}
