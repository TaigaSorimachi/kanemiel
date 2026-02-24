# カネミエル 開発タスク一覧

> Phase 1 (MVP) のタスクを詳細に分解。
> 各タスクには推定時間、依存関係、完了条件を記載。

---

## Phase 0: プロジェクト基盤構築

### 0-1. リポジトリ・プロジェクト初期化
- [ ] **0-1-1** モノレポ構成の作成
  - `/apps/web` — Next.js フロントエンド
  - `/apps/api` — NestJS バックエンド
  - `/packages/shared` — 共通型定義
  - `/docs` — 設計書
  - `/prisma` — Prisma スキーマ・マイグレーション
  - 推定: 1h
- [ ] **0-1-2** Next.js プロジェクト初期化
  - App Router, TypeScript, Tailwind CSS, ESLint
  - 推定: 0.5h
- [ ] **0-1-3** NestJS プロジェクト初期化
  - TypeScript, Swagger, class-validator, class-transformer
  - 推定: 0.5h
- [ ] **0-1-4** Prisma セットアップ
  - PostgreSQL 接続設定, `.env` テンプレート
  - 推定: 0.5h
- [ ] **0-1-5** Docker Compose 設定
  - PostgreSQL コンテナ
  - 開発用 hot reload 設定
  - 推定: 1h
- [ ] **0-1-6** CLAUDE.md 作成
  - プロジェクト概要、開発ルール、コマンド一覧
  - 推定: 0.5h
- [ ] **0-1-7** 共通型定義パッケージ作成
  - ロール型、ステータス型、API レスポンス型
  - 推定: 0.5h

### 0-2. CI/CD・品質管理
- [ ] **0-2-1** ESLint + Prettier 設定（共通ルール）
  - 推定: 0.5h
- [ ] **0-2-2** Husky + lint-staged 設定
  - commit 前の自動リント
  - 推定: 0.5h

---

## Phase 1-A: データベース基盤（Week 1-2）

### 1-1. Prisma スキーマ定義
- [ ] **1-1-1** Company モデル定義
  - id, name, bank_balance, danger_line, timestamps
  - 推定: 0.5h
- [ ] **1-1-2** User モデル定義
  - id, company_id, name, role(enum), line_user_id, line_notification
  - company との relation
  - 推定: 0.5h
- [ ] **1-1-3** Project モデル定義
  - id, company_id, name, client_id, contract_amount, status(enum), foreman_id, dates
  - company, client, foreman との relation
  - 推定: 0.5h
- [ ] **1-1-4** Client モデル定義
  - id, company_id, name, type(enum), payment_terms
  - 推定: 0.5h
- [ ] **1-1-5** IncomeSchedule モデル定義
  - id, project_id, client_id, amount, scheduled_date, income_type(enum), status(enum), actual_date
  - 推定: 0.5h
- [ ] **1-1-6** PaymentRequest モデル定義
  - id, project_id, requester_id, client_id, amount, category(enum), desired_date, status(enum), note, photo_url
  - 推定: 0.5h
- [ ] **1-1-7** ApprovalLog モデル定義
  - id, request_id, approver_id, action(enum), comment
  - 推定: 0.3h
- [ ] **1-1-8** Transaction モデル定義
  - id, project_id, type(enum), amount, date, category, client_id, description
  - 推定: 0.5h
- [ ] **1-1-9** Notification モデル定義
  - id, user_id, type(enum), title, message, is_read, link_url, sent_via_line
  - 推定: 0.3h
- [ ] **1-1-10** Enum 定義の整理
  - UserRole, ProjectStatus, IncomeType, IncomeScheduleStatus, PaymentCategory, PaymentRequestStatus, ApprovalAction, TransactionType, NotificationType
  - 推定: 0.5h

### 1-2. マイグレーション・シード
- [ ] **1-2-1** 初回マイグレーション実行
  - `prisma migrate dev --name init`
  - 推定: 0.3h
- [ ] **1-2-2** シードデータ作成
  - デモ用会社1社
  - ユーザー3名（社長/経理/現場監督）
  - 現場4件（A〜D）
  - 取引先5社
  - 入出金予定・実績の sample データ
  - 支払申請3件（pending状態）
  - 推定: 2h
  - 完了条件: `prisma db seed` でデモデータが投入され、プロトタイプ相当のデータが再現できる

---

## Phase 1-B: バックエンド API（Week 2-4）

### 1-3. 認証モジュール
- [ ] **1-3-1** LINE LIFF 認証エンドポイント
  - POST `/api/auth/line` — LINE ID Token を検証、JWT 発行
  - 推定: 3h
  - 依存: 1-1-2
- [ ] **1-3-2** AuthGuard 実装
  - JWT からユーザー情報を取得
  - リクエストに user を注入
  - 推定: 1.5h
- [ ] **1-3-3** RoleGuard 実装
  - `@Roles('owner', 'accounting')` デコレータ
  - ロールに基づくアクセス制御
  - 推定: 1h
- [ ] **1-3-4** ProjectAccessGuard 実装
  - 現場監督は担当現場のみアクセス可
  - project_id パラメータとユーザーの foreman 割り当てを照合
  - 推定: 1.5h
- [ ] **1-3-5** GET `/api/auth/me` エンドポイント
  - ログインユーザー情報を返却
  - 推定: 0.5h

### 1-4. マスタ管理 API
- [ ] **1-4-1** 現場 CRUD API
  - GET/POST/PATCH `/api/projects`
  - GET `/api/projects/:id`
  - 一覧はロールに応じてフィルタ（foreman は担当のみ）
  - 推定: 2h
- [ ] **1-4-2** 取引先 CRUD API
  - GET/POST `/api/clients`
  - type フィルタ（元請/委託先）
  - 推定: 1.5h
- [ ] **1-4-3** ユーザー管理 API
  - GET `/api/users` （管理者用）
  - PATCH `/api/users/:id/settings`（通知設定等）
  - 推定: 1h

### 1-5. 支払申請・承認 API
- [ ] **1-5-1** POST `/api/payment-requests` — 申請作成
  - バリデーション: 必須項目チェック、金額 > 0
  - 写真アップロード（S3 or ローカル）
  - 作成後に承認者へ通知トリガー
  - 推定: 3h
  - 依存: 1-3-1, 1-4-1
- [ ] **1-5-2** GET `/api/payment-requests/pending` — 承認待ち一覧
  - status = 'pending' のみ取得
  - ロール制御: owner, accounting のみ
  - 推定: 1h
- [ ] **1-5-3** POST `/api/payment-requests/:id/approve` — 承認
  - ステータス更新 + approval_logs 追加
  - 申請者へ承認通知
  - 推定: 2h
- [ ] **1-5-4** POST `/api/payment-requests/:id/reject` — 差戻し
  - ステータス更新 + approval_logs 追加 + コメント
  - 申請者へ差戻し通知
  - 推定: 1h
- [ ] **1-5-5** GET `/api/payment-requests/:id/impact` — 影響プレビュー
  - 承認した場合の現場残高・会社残高を計算
  - 信号判定を含めて返却
  - 推定: 2h
  - 完了条件: プロトタイプの承認画面と同等の情報を返せる

### 1-6. 入出金 API
- [ ] **1-6-1** POST `/api/transactions/income` — 入金登録
  - バリデーション、income_schedule との紐づけ（あれば status 更新）
  - 推定: 2h
- [ ] **1-6-2** GET `/api/transactions` — 入出金実績一覧
  - project_id フィルタ、日付範囲フィルタ
  - 推定: 1h
- [ ] **1-6-3** POST/GET `/api/income-schedules` — 入金予定管理
  - 推定: 1.5h

### 1-7. ダッシュボード API
- [ ] **1-7-1** GET `/api/dashboard` — ダッシュボード一括データ
  - 残高、3ヶ月シグナル、アラート、現場サマリを一回のAPIで返す
  - ロール別のデータ範囲制御
  - 推定: 4h
  - 依存: 1-4-1, 1-5-2, 1-6-2
  - 完了条件: プロトタイプのダッシュボード全データを1 APIで取得可能
- [ ] **1-7-2** GET `/api/dashboard/chart` — 残高推移チャートデータ
  - 過去2ヶ月 + 未来3ヶ月の半月刻みデータ
  - 入金予定・支出予定・承認済み支払いから予測計算
  - 推定: 3h
- [ ] **1-7-3** 信号判定サービス
  - `SignalService.calculate(companyId, month)` → 🟢/🟡/🔴
  - 危険ライン設定を参照
  - 推定: 2h

### 1-8. レポート API
- [ ] **1-8-1** GET `/api/reports/summary` — 全体サマリ
  - 当月入金合計、支出合計、収支、承認待ち件数/金額
  - 月別推移データ（過去5ヶ月）
  - 現場別健全度
  - 推定: 3h
- [ ] **1-8-2** GET `/api/reports/by-project` — 現場別収支
  - 全現場の契約/入金/支出/残高テーブル
  - 支出区分の内訳
  - 推定: 2h
- [ ] **1-8-3** GET `/api/reports/cashflow-table` — 資金繰り表
  - 4ヶ月分の月次資金繰り表データ
  - 入金内訳（元請/その他）、支出内訳（外注/材料/その他）
  - 月末残高 + 信号
  - 推定: 3h

---

## Phase 1-C: フロントエンド（Week 3-6）

### 1-9. 共通コンポーネント
- [ ] **1-9-1** レイアウトコンポーネント
  - Header（ロゴ、通知ベル、メニュー）
  - BottomNav（5タブ）
  - ロール状態のグローバル管理（Context or Zustand）
  - 推定: 3h
- [ ] **1-9-2** 信号コンポーネント
  - `<Signal status="green" />` — 🟢🟡🔴の表示
  - サイズ・スタイルバリエーション
  - 推定: 1h
- [ ] **1-9-3** カードコンポーネント群
  - BalanceCard, SignalCard, AlertCard, ProjectCard
  - 推定: 2h
- [ ] **1-9-4** フォームコンポーネント群
  - SelectGrid（ボタン選択式）, QuickAmountPicker, DateInput, PhotoUploader
  - 推定: 3h
- [ ] **1-9-5** モーダル・オーバーレイ
  - BottomSheet, SuccessOverlay, Toast
  - 推定: 2h
- [ ] **1-9-6** ブランドテーマ設定
  - Tailwind カスタムカラー（Navy, Gold, Green, Yellow, Red）
  - フォント設定（Noto Sans JP, DM Sans, Cormorant Garamond）
  - 推定: 1h

### 1-10. ダッシュボード画面
- [ ] **1-10-1** 残高カード実装
  - Navy グラデーション背景、金額表示、LIVE バッジ
  - 推定: 1.5h
- [ ] **1-10-2** 3ヶ月シグナルカード実装
  - 3カラムグリッド、選択状態のハイライト
  - 推定: 1h
- [ ] **1-10-3** 残高推移チャート実装
  - Recharts 折れ線グラフ + 危険ラインの破線
  - 推定: 3h
- [ ] **1-10-4** アラート一覧実装
  - 左ボーダー色つきカード、タップでナビゲーション
  - 推定: 1h
- [ ] **1-10-5** 現場一覧カード実装
  - 信号ドット + プログレスバー + タップでモーダル
  - 推定: 1.5h
- [ ] **1-10-6** 現場詳細モーダル実装
  - BottomSheet、契約情報、入出金タイムライン
  - 推定: 2h
- [ ] **1-10-7** API 接続・データバインド
  - `/api/dashboard` のフェッチ、ローディング状態、エラー処理
  - 推定: 2h
- [ ] **1-10-8** ロール別表示切替
  - 現場監督: 担当現場のみ、全社データ非表示
  - 推定: 2h
  - 完了条件: プロトタイプと同等の見た目・動作が再現できる

### 1-11. 承認画面
- [ ] **1-11-1** 承認待ち一覧ページ
  - サマリバー（件数・合計金額）
  - 承認カードのリスト表示
  - 推定: 2h
- [ ] **1-11-2** 承認カード詳細
  - メタ情報、影響プレビュー表示
  - 推定: 2h
- [ ] **1-11-3** 承認/差戻しアクション
  - ボタン押下 → API呼出 → カードのフェードアウト → トースト
  - 差戻しコメント入力
  - 推定: 2h
- [ ] **1-11-4** API 接続
  - pending一覧取得、approve/reject API呼出
  - 推定: 1.5h

### 1-12. 入力画面
- [ ] **1-12-1** 支払申請/入金登録のタブ切替
  - 推定: 0.5h
- [ ] **1-12-2** 支払申請フォーム
  - 現場選択（ボタン式）、支払先選択、金額入力 + クイックボタン
  - 日付、区分、備考、写真
  - 推定: 4h
- [ ] **1-12-3** リアルタイム影響プレビュー
  - 金額入力に連動して impact API 呼出
  - 推定: 2h
- [ ] **1-12-4** 入金登録フォーム
  - 現場、入金元、金額、日付、種別
  - 推定: 2h
- [ ] **1-12-5** 送信処理
  - バリデーション → API → 成功オーバーレイ → ダッシュボードに戻る
  - 推定: 2h
- [ ] **1-12-6** API 接続
  - payment-requests POST, transactions/income POST
  - 推定: 1.5h

### 1-13. レポート画面
- [ ] **1-13-1** 3タブの切替UI
  - 推定: 0.5h
- [ ] **1-13-2** 全体サマリタブ
  - KPIカード4枚、月別推移チャート、現場別健全度バー
  - 推定: 3h
- [ ] **1-13-3** 現場別収支タブ
  - テーブル表示、支出区分の内訳バー
  - 推定: 2h
- [ ] **1-13-4** 資金繰り表タブ
  - 月次テーブル（4ヶ月分）、危険月アラート
  - 推定: 3h
- [ ] **1-13-5** API 接続
  - reports API 3本の接続
  - 推定: 1.5h

### 1-14. 設定画面
- [ ] **1-14-1** 設定画面実装
  - ロール表示、通知設定、危険ライン変更
  - 推定: 1.5h

---

## Phase 1-D: LINE 連携（Week 5-7）

### 1-15. LINE LIFF 設定
- [ ] **1-15-1** LINE Developers チャネル作成
  - LIFF アプリ登録
  - Messaging API チャネル設定
  - 推定: 1h（手動作業含む）
- [ ] **1-15-2** LIFF SDK フロントエンド統合
  - `liff.init()`, `liff.login()`, `liff.getProfile()`
  - 推定: 2h
- [ ] **1-15-3** LIFF ログインフロー実装
  - LINE認証 → JWT取得 → セッション管理
  - 推定: 3h

### 1-16. LINE 通知実装
- [ ] **1-16-1** LINE Messaging API クライアント実装
  - NestJS サービスとして `LineNotificationService`
  - push message, flex message 送信
  - 推定: 2h
- [ ] **1-16-2** 承認依頼通知テンプレート
  - Flex Message で承認ボタン付き通知
  - 推定: 2h
- [ ] **1-16-3** 日次サマリ通知テンプレート
  - 毎朝8時の残高・承認待ちサマリ
  - 推定: 1.5h
- [ ] **1-16-4** 危険アラート通知テンプレート
  - 資金不足予測・入金遅延の即時通知
  - 推定: 1.5h
- [ ] **1-16-5** 定時バッチ（Cron）設定
  - 日次サマリ: 毎朝8時
  - 入金遅延チェック: 毎日9時
  - NestJS @Cron デコレータ
  - 推定: 2h

---

## Phase 1-E: テスト・品質保証（Week 7-8）

### 1-17. バックエンドテスト
- [ ] **1-17-1** 信号判定ロジック単体テスト
  - 各パターン（安全/注意/危険）のテストケース
  - 推定: 1.5h
- [ ] **1-17-2** 支払申請・承認フロー統合テスト
  - 申請 → 承認 → ステータス確認 → 通知トリガー確認
  - 推定: 2h
- [ ] **1-17-3** ロール別アクセス制御テスト
  - 各ロールで許可/拒否されるAPI のテスト
  - 推定: 2h
- [ ] **1-17-4** ダッシュボードAPI 結合テスト
  - シードデータに対するレスポンス検証
  - 推定: 1.5h

### 1-18. フロントエンドテスト
- [ ] **1-18-1** 主要コンポーネントの表示テスト
  - Signal, BalanceCard, ApprovalCard
  - 推定: 2h
- [ ] **1-18-2** フォームバリデーションテスト
  - 支払申請フォームの必須チェック・金額チェック
  - 推定: 1.5h

### 1-19. デプロイ・運用準備
- [ ] **1-19-1** Vercel デプロイ設定
  - Next.js ビルド設定、環境変数
  - 推定: 1h
- [ ] **1-19-2** Railway デプロイ設定
  - NestJS + PostgreSQL のデプロイ
  - 推定: 1.5h
- [ ] **1-19-3** 本番環境の動作確認
  - 全画面の表示確認
  - API の疎通確認
  - LINE 認証・通知の動作確認
  - 推定: 2h
- [ ] **1-19-4** デモデータ投入
  - 本番用のシードデータ
  - 推定: 1h

---

## Phase 2 タスク概要（定着後に詳細化）

### 2-1. 予算 vs 実績管理
- [ ] budgets テーブル追加（Prisma マイグレーション）
- [ ] 予算登録 API（POST `/api/projects/:id/budget`）
- [ ] 予算 vs 実績比較 API
- [ ] 予算比較画面（現場詳細に追加）

### 2-2. 入金遅延アラート
- [ ] 入金遅延検知バッチの強化
- [ ] 遅延日数のトラッキング
- [ ] 段階的アラート（3日遅延 → 7日遅延 → 14日遅延）
- [ ] 遅延一覧画面

### 2-3. 3ヶ月キャッシュフロー予測
- [ ] 予測エンジン（登録済み入出金 + 過去パターン）
- [ ] 予測チャートの精度向上
- [ ] What-if シミュレーション（「この支払いを延期したら？」）

---

## Phase 3 タスク概要（データ蓄積後に詳細化）

### 3-1. 過去実績分析
- [ ] 類似工事の支出パターン抽出
- [ ] 新規案件の資金計画テンプレート

### 3-2. レポート出力
- [ ] PDF 資金繰り表の生成
- [ ] Excel レポートの生成

### 3-3. 外部連携
- [ ] 会計ソフトインポート/エクスポート
- [ ] 銀行 API 連携（将来検討）

---

## 実行優先順位

```
Phase 0（基盤） → Phase 1-A（DB） → Phase 1-B（API）→ Phase 1-C（Frontend）
                                                  ↘ Phase 1-D（LINE）
                                                       ↘ Phase 1-E（テスト・デプロイ）
```

各フェーズは並行作業可能だが、依存関係に注意:
- API は DB 完了後に開始
- Frontend は API のエンドポイント仕様確定後に接続
- LINE は認証 API 完了後に統合
- テストは各機能の実装完了後に順次実施
