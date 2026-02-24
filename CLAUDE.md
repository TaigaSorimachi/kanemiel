# CLAUDE.md — カネミエル (KANEMIEL)

## プロジェクト概要

建設業向け現場キャッシュフロー管理システム。
「今月、大丈夫？」が3秒でわかる信号機方式のUI。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/DESIGN.md` | システム設計書（全体仕様・画面設計・DB設計・API設計） |
| `docs/TASKS.md` | 開発タスク一覧（Phase 0〜3、依存関係・完了条件付き） |
| `docs/prototype/index.html` | インタラクティブHTMLプロトタイプ（ブランドデザイン確定版） |

## 技術スタック

- **Frontend**: Next.js 14+ (App Router) / TypeScript / Tailwind CSS / Recharts
- **Backend**: NestJS 10+ / TypeScript / Prisma 5+
- **DB**: PostgreSQL 15+
- **Auth**: LINE LIFF SDK
- **通知**: LINE Messaging API
- **Hosting**: Vercel (Frontend) + Railway (Backend/DB)

## プロジェクト構成

```
kanemiel/
├── CLAUDE.md                 # このファイル
├── apps/
│   ├── web/                  # Next.js フロントエンド
│   │   ├── app/              # App Router ページ
│   │   ├── components/       # UIコンポーネント
│   │   ├── lib/              # ユーティリティ
│   │   └── styles/           # グローバルスタイル
│   └── api/                  # NestJS バックエンド
│       ├── src/
│       │   ├── auth/         # 認証モジュール
│       │   ├── projects/     # 現場モジュール
│       │   ├── payments/     # 支払申請・承認モジュール
│       │   ├── transactions/ # 入出金モジュール
│       │   ├── dashboard/    # ダッシュボードモジュール
│       │   ├── reports/      # レポートモジュール
│       │   ├── notifications/# 通知モジュール
│       │   └── common/       # 共通ガード・デコレータ
│       └── test/
├── packages/
│   └── shared/               # 共通型定義
├── prisma/
│   ├── schema.prisma         # Prisma スキーマ
│   ├── migrations/           # マイグレーション
│   └── seed.ts               # シードデータ
├── docs/
│   ├── DESIGN.md             # 設計書
│   ├── TASKS.md              # タスク一覧
│   └── prototype/            # HTMLプロトタイプ
└── docker-compose.yml
```

## ブランドカラー

```
Navy (Primary):    #0C1929
Navy Mid:          #162544
Navy Light:        #1E3355
Gold (Accent):     #C9A84C
Gold Light:        #E8D48B
Green (Success):   #22B573
Yellow (Warning):  #E5A117
Red (Danger):      #E04343
Background:        #F4F6FA
Sub Text:          #6B7A90
```

## ユーザーロール

| ロール | Enum値 | 概要 |
|--------|--------|------|
| 経営者 | `owner` | 全社閲覧・承認 |
| 経理 | `accounting` | 全社閲覧・入力・承認 |
| 現場監督 | `foreman` | 担当現場のみ・申請のみ |

## 開発コマンド

```bash
# 開発環境起動
docker-compose up -d          # PostgreSQL起動
cd apps/web && npm run dev    # フロントエンド
cd apps/api && npm run start:dev  # バックエンド

# DB操作
npx prisma migrate dev        # マイグレーション
npx prisma db seed            # シードデータ投入
npx prisma studio             # GUI確認

# テスト
cd apps/api && npm run test
cd apps/web && npm run test
```

## 開発ルール

1. **TypeScript strict mode** — any 禁止
2. **API レスポンス** — 統一フォーマット `{ success: boolean, data: T, message?: string }`
3. **エラーハンドリング** — NestJS の Exception Filter で統一
4. **ロール制御** — すべてのAPIエンドポイントに `@Roles()` を設定
5. **現場アクセス制御** — foreman は担当現場以外のデータに触れない
6. **金額** — Prisma の `Decimal` 型、フロントでは万円表示
7. **日付** — UTC で保存、表示時に JST 変換
8. **コミットメッセージ** — `feat:`, `fix:`, `docs:`, `refactor:` prefix

## 信号判定ロジック

```typescript
function calculateSignal(balance: number, dangerLine: number): 'green' | 'yellow' | 'red' {
  if (balance > dangerLine * 2) return 'green';
  if (balance > dangerLine) return 'yellow';
  return 'red';
}
```

## 現在の開発状況

- [x] 要件定義・全体設計
- [x] プロトタイプ（HTML）作成
- [x] ブランドデザイン確定（ネイビー×ゴールド）
- [x] GitHub リポジトリ作成
- [ ] Phase 0: プロジェクト基盤構築 ← **次のステップ**
- [ ] Phase 1-A: データベース基盤
- [ ] Phase 1-B: バックエンド API
- [ ] Phase 1-C: フロントエンド
- [ ] Phase 1-D: LINE 連携
- [ ] Phase 1-E: テスト・デプロイ
