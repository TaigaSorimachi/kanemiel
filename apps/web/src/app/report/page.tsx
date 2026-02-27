'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function formatMan(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}万`;
}

function formatMonth(ym: string): string {
  const [, m] = ym.split('-');
  return `${Number(m)}月`;
}

type SignalStatus = 'green' | 'yellow' | 'red';

function SignalDot({ status, size = 'sm' }: { status: SignalStatus; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const colorClass =
    status === 'green'
      ? 'bg-success'
      : status === 'yellow'
      ? 'bg-warning'
      : 'bg-danger';
  return <span className={`inline-block rounded-full ${sizeClass} ${colorClass}`} />;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_SUMMARY = {
  currentMonth: {
    incomeTotal: 5500000,
    expenseTotal: 3600000,
    netIncome: 1900000,
    pendingApprovalCount: 3,
    pendingApprovalAmount: 2250000,
  },
  monthlyTrend: [
    { month: '2025-10', income: 4200000, expense: 3100000, net: 1100000 },
    { month: '2025-11', income: 5800000, expense: 4200000, net: 1600000 },
    { month: '2025-12', income: 3500000, expense: 2800000, net: 700000 },
    { month: '2026-01', income: 6000000, expense: 3500000, net: 2500000 },
    { month: '2026-02', income: 5500000, expense: 3600000, net: 1900000 },
  ],
  projectHealth: [
    { projectId: '1', projectName: 'A現場', healthPercent: 0.33, signal: 'green' as const },
    { projectId: '2', projectName: 'B現場', healthPercent: 0.24, signal: 'green' as const },
    { projectId: '3', projectName: 'C現場', healthPercent: 0.25, signal: 'yellow' as const },
    { projectId: '4', projectName: 'D現場', healthPercent: 0, signal: 'red' as const },
  ],
};

const DEMO_BY_PROJECT = {
  projects: [
    {
      projectId: '1',
      projectName: 'A現場',
      contractAmount: 12000000,
      incomeTotal: 4000000,
      expenseTotal: 2300000,
      balance: 1700000,
      status: 'green' as const,
      expenseByCategory: { subcontracting: 1500000, material: 800000, equipment: 0, transport: 0, other: 0 },
    },
    {
      projectId: '2',
      projectName: 'B現場',
      contractAmount: 8500000,
      incomeTotal: 2000000,
      expenseTotal: 1200000,
      balance: 800000,
      status: 'green' as const,
      expenseByCategory: { subcontracting: 1200000, material: 0, equipment: 0, transport: 0, other: 0 },
    },
    {
      projectId: '3',
      projectName: 'C現場',
      contractAmount: 6000000,
      incomeTotal: 1500000,
      expenseTotal: 600000,
      balance: 900000,
      status: 'yellow' as const,
      expenseByCategory: { subcontracting: 0, material: 600000, equipment: 0, transport: 0, other: 0 },
    },
    {
      projectId: '4',
      projectName: 'D現場',
      contractAmount: 15000000,
      incomeTotal: 0,
      expenseTotal: 200000,
      balance: -200000,
      status: 'red' as const,
      expenseByCategory: { subcontracting: 0, material: 200000, equipment: 0, transport: 0, other: 0 },
    },
  ],
  totals: { contractAmount: 41500000, incomeTotal: 7500000, expenseTotal: 4300000, balance: 3200000 },
};

const DEMO_CASHFLOW = {
  months: [
    {
      month: '2026-02',
      openingBalance: 15200000,
      income: { generalContractor: 4000000, other: 0, total: 4000000 },
      expense: { subcontracting: 1800000, material: 1050000, other: 0, total: 2850000 },
      closingBalance: 16350000,
      signal: 'green' as const,
    },
    {
      month: '2026-03',
      openingBalance: 16350000,
      income: { generalContractor: 5000000, other: 2000000, total: 7000000 },
      expense: { subcontracting: 3000000, material: 1500000, other: 500000, total: 5000000 },
      closingBalance: 18350000,
      signal: 'green' as const,
    },
    {
      month: '2026-04',
      openingBalance: 18350000,
      income: { generalContractor: 5000000, other: 0, total: 5000000 },
      expense: { subcontracting: 8000000, material: 3000000, other: 1000000, total: 12000000 },
      closingBalance: 11350000,
      signal: 'green' as const,
    },
    {
      month: '2026-05',
      openingBalance: 11350000,
      income: { generalContractor: 3000000, other: 0, total: 3000000 },
      expense: { subcontracting: 6000000, material: 4000000, other: 2000000, total: 12000000 },
      closingBalance: 2350000,
      signal: 'yellow' as const,
    },
  ],
  dangerAlerts: [] as string[],
};

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = 'summary' | 'project' | 'cashflow';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: '全体サマリ' },
  { key: 'project', label: '現場別収支' },
  { key: 'cashflow', label: '資金繰り表' },
];

// ---------------------------------------------------------------------------
// Category bar colors (navy shades)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  subcontracting: '#0C1929',
  material: '#162544',
  equipment: '#1E3355',
  transport: '#2C4A7C',
  other: '#6B7A90',
};

const CATEGORY_LABELS: Record<string, string> = {
  subcontracting: '外注費',
  material: '材料費',
  equipment: '機材',
  transport: '交通費',
  other: 'その他',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabNav({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (t: TabKey) => void }) {
  return (
    <div className="flex border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === tab.key ? 'text-gold' : 'text-sub'
          }`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[3px] bg-gold rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 - Overall Summary
// ---------------------------------------------------------------------------

function SummaryTab() {
  const { currentMonth, monthlyTrend, projectHealth } = DEMO_SUMMARY;

  const chartData = monthlyTrend.map((d) => ({
    name: formatMonth(d.month),
    入金: d.income,
    支出: d.expense,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="入金合計" value={formatYen(currentMonth.incomeTotal)} color="text-success" />
        <KpiCard label="支出合計" value={formatYen(currentMonth.expenseTotal)} color="text-danger" />
        <KpiCard
          label="今月収支"
          value={formatYen(currentMonth.netIncome)}
          color={currentMonth.netIncome >= 0 ? 'text-success' : 'text-danger'}
        />
        <KpiCard
          label="承認待ち"
          value={`${currentMonth.pendingApprovalCount}件`}
          sub={formatYen(currentMonth.pendingApprovalAmount)}
          color="text-warning"
        />
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <p className="text-sm font-semibold mb-3">月次推移</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F1" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7A90' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#6B7A90' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatMan(v)}
              />
              <Tooltip
                formatter={(value: number) => formatYen(value)}
                labelStyle={{ color: '#0C1929', fontWeight: 600 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E4E9F1' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="入金" fill="#22B573" radius={[4, 4, 0, 0]} />
              <Bar dataKey="支出" fill="#E04343" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Health */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <p className="text-sm font-semibold mb-3">現場ヘルス</p>
        <div className="space-y-3">
          {projectHealth.map((p) => (
            <div key={p.projectId} className="flex items-center gap-3">
              <SignalDot status={p.signal} size="md" />
              <span className="text-sm font-medium w-16 shrink-0">{p.projectName}</span>
              <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all"
                  style={{ width: `${Math.max(p.healthPercent * 100, 2)}%` }}
                />
              </div>
              <span className="text-xs text-sub w-10 text-right">{Math.round(p.healthPercent * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
      <p className="text-xs text-sub mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-sub mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 - Per-Project Financials
// ---------------------------------------------------------------------------

function ProjectTab() {
  const { projects, totals } = DEMO_BY_PROJECT;

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[540px]">
            <thead>
              <tr className="bg-navy text-white/80">
                <th className="py-2.5 px-3 text-left font-semibold">現場</th>
                <th className="py-2.5 px-3 text-right font-semibold">契約</th>
                <th className="py-2.5 px-3 text-right font-semibold">入金</th>
                <th className="py-2.5 px-3 text-right font-semibold">支出</th>
                <th className="py-2.5 px-3 text-right font-semibold">残高</th>
                <th className="py-2.5 px-2 text-center font-semibold">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.projectId} className="hover:bg-bg/50">
                  <td className="py-2.5 px-3 font-medium">{p.projectName}</td>
                  <td className="py-2.5 px-3 text-right">{formatMan(p.contractAmount)}</td>
                  <td className="py-2.5 px-3 text-right text-success">{formatMan(p.incomeTotal)}</td>
                  <td className="py-2.5 px-3 text-right text-danger">{formatMan(p.expenseTotal)}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-semibold ${
                      p.balance >= 0 ? 'text-navy' : 'text-danger'
                    }`}
                  >
                    {formatMan(p.balance)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <SignalDot status={p.status} size="md" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy/5 font-bold text-sm">
                <td className="py-2.5 px-3">合計</td>
                <td className="py-2.5 px-3 text-right">{formatMan(totals.contractAmount)}</td>
                <td className="py-2.5 px-3 text-right text-success">{formatMan(totals.incomeTotal)}</td>
                <td className="py-2.5 px-3 text-right text-danger">{formatMan(totals.expenseTotal)}</td>
                <td className="py-2.5 px-3 text-right text-navy">{formatMan(totals.balance)}</td>
                <td className="py-2.5 px-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Expense Category Breakdown */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <p className="text-sm font-semibold mb-4">費目内訳</p>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
              <span className="text-xs text-sub">{label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {projects.map((p) => {
            const total = p.expenseTotal || 1;
            const cats = p.expenseByCategory;
            return (
              <div key={p.projectId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{p.projectName}</span>
                  <span className="text-xs text-sub">{formatMan(p.expenseTotal)}</span>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden bg-border">
                  {Object.entries(cats).map(([key, value]) => {
                    if (value === 0) return null;
                    const pct = (value / total) * 100;
                    return (
                      <div
                        key={key}
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[key],
                          minWidth: pct > 0 ? '4px' : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 - Cashflow Table
// ---------------------------------------------------------------------------

function CashflowTab() {
  const { months, dangerAlerts } = DEMO_CASHFLOW;

  return (
    <div className="space-y-4">
      {months.map((m) => {
        const closingColor =
          m.signal === 'green' ? 'text-success' : m.signal === 'yellow' ? 'text-warning' : 'text-danger';
        return (
          <div key={m.month} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {/* Month header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-navy/5 border-b border-border">
              <SignalDot status={m.signal} size="md" />
              <span className="text-sm font-bold">{formatMonth(m.month)}</span>
            </div>

            <div className="px-4 py-3 space-y-2 text-sm">
              {/* Opening balance */}
              <Row label="月初残高" value={formatYen(m.openingBalance)} bold />

              {/* Income section */}
              <Row label="入金合計" value={formatYen(m.income.total)} color="text-success" />
              <SubRow label="元請入金" value={formatYen(m.income.generalContractor)} />
              {m.income.other > 0 && <SubRow label="その他" value={formatYen(m.income.other)} />}

              {/* Expense section */}
              <Row label="支出合計" value={formatYen(m.expense.total)} color="text-danger" />
              <SubRow label="外注費" value={formatYen(m.expense.subcontracting)} />
              <SubRow label="材料費" value={formatYen(m.expense.material)} />
              {m.expense.other > 0 && <SubRow label="その他" value={formatYen(m.expense.other)} />}

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Closing balance */}
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold">月末残高</span>
                <span className={`font-bold text-base ${closingColor}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatYen(m.closingBalance)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Danger Alerts */}
      {dangerAlerts.length > 0 && (
        <div className="rounded-xl border-2 border-danger bg-danger-bg p-4">
          <p className="text-sm font-bold text-danger mb-2">&#x26A0;&#xFE0F; 資金不足の見込み</p>
          <ul className="space-y-1">
            {dangerAlerts.map((alert, i) => (
              <li key={i} className="text-xs text-danger/80">
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={`${color ?? ''} ${bold ? 'font-semibold' : ''}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {value}
      </span>
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center pl-4 text-sub text-xs">
      <span>{label}</span>
      <span style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  return (
    <main className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-6 pb-4">
        <h1 className="text-white text-lg font-bold">レポート</h1>
        <p className="text-white/60 text-xs mt-0.5">月次サマリ・現場収支・資金繰り</p>
      </div>

      {/* Tabs */}
      <div className="bg-card sticky top-0 z-10 shadow-sm">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'project' && <ProjectTab />}
        {activeTab === 'cashflow' && <CashflowTab />}
      </div>
    </main>
  );
}
