import { SignalStatus } from './enums';

/** 統一APIレスポンス */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** 月別キャッシュフロー信号データ */
export interface SignalData {
  /** 対象月 (YYYY-MM 形式) */
  month: string;
  /** 信号ステータス */
  signal: SignalStatus;
  /** 残高 */
  balance: number;
  /** 入金合計 */
  income: number;
  /** 出金合計 */
  expense: number;
}

/** ダッシュボード全体データ */
export interface DashboardData {
  /** 現在の銀行残高 */
  bankBalance: number;
  /** 月別信号データ */
  signals: SignalData[];
  /** アラート一覧 */
  alerts: AlertItem[];
  /** 現場サマリー一覧 */
  projects: ProjectSummary[];
}

/** アラート項目 */
export interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  linkUrl?: string;
}

/** 現場サマリー */
export interface ProjectSummary {
  id: string;
  /** 現場名 */
  name: string;
  /** 信号ステータス */
  signal: SignalStatus;
  /** 現場残高 */
  balance: number;
  /** 契約金額 */
  contractAmount: number;
  /** 入金合計 */
  incomeTotal: number;
  /** 出金合計 */
  expenseTotal: number;
}

/** 承認時のインパクト予測 */
export interface ApprovalImpact {
  /** 承認後の現場残高 */
  projectBalanceAfter: number;
  /** 承認後の現場信号 */
  projectSignalAfter: SignalStatus;
  /** 承認後の全社残高 */
  companyBalanceAfter: number;
  /** 承認後の全社信号 */
  companySignalAfter: SignalStatus;
}
