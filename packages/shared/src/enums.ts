/** ユーザーロール */
export enum UserRole {
  /** 経営者 — 全社閲覧・承認 */
  OWNER = 'owner',
  /** 経理 — 全社閲覧・入力・承認 */
  ACCOUNTING = 'accounting',
  /** 現場監督 — 担当現場のみ・申請のみ */
  FOREMAN = 'foreman',
}

/** 現場ステータス */
export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

/** 入金種別 */
export enum IncomeType {
  /** 出来高 */
  PROGRESS = 'progress',
  /** 前受金 */
  ADVANCE = 'advance',
  /** 最終金 */
  FINAL = 'final',
}

/** 入金予定ステータス */
export enum IncomeScheduleStatus {
  SCHEDULED = 'scheduled',
  RECEIVED = 'received',
  OVERDUE = 'overdue',
}

/** 支払カテゴリ */
export enum PaymentCategory {
  /** 外注費 */
  SUBCONTRACTING = 'subcontracting',
  /** 材料費 */
  MATERIAL = 'material',
  /** 機材費 */
  EQUIPMENT = 'equipment',
  /** 運搬費 */
  TRANSPORT = 'transport',
  /** その他 */
  OTHER = 'other',
}

/** 支払申請ステータス */
export enum PaymentRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

/** 承認アクション */
export enum ApprovalAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** 入出金区分 */
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

/** 通知種別 */
export enum NotificationType {
  /** 承認依頼 */
  APPROVAL_REQUEST = 'approval_request',
  /** 危険アラート */
  DANGER_ALERT = 'danger_alert',
  /** 日次サマリー */
  DAILY_SUMMARY = 'daily_summary',
  /** 入金遅延 */
  OVERDUE = 'overdue',
}

/** 取引先種別 */
export enum ClientType {
  /** 元請 */
  GENERAL_CONTRACTOR = 'general_contractor',
  /** 下請 */
  SUBCONTRACTOR = 'subcontractor',
}

/** 信号ステータス */
export enum SignalStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}
