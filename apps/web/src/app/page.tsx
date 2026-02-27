'use client';

import { useState, useEffect, useCallback } from 'react';
import BalanceCard from '@/components/ui/BalanceCard';
import SignalCard from '@/components/ui/SignalCard';
import AlertCard from '@/components/ui/AlertCard';
import ProjectCard from '@/components/ui/ProjectCard';
import BottomSheet from '@/components/ui/BottomSheet';
import Signal from '@/components/ui/Signal';
import { formatYen, formatDate } from '@/components/format';
import { api } from '@/lib/api';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SignalData {
  month: string;
  predictedBalance: number;
  signal: 'green' | 'yellow' | 'red';
}

interface AlertData {
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
}

interface ProjectData {
  id: string;
  name: string;
  signal: 'green' | 'yellow' | 'red';
  balance: number;
  contractAmount: number;
  incomeTotal: number;
  expenseTotal: number;
  incomeProgress: number;
}

interface ChartPoint {
  date: string;
  balance: number;
  dangerLine: number;
}

interface DashboardData {
  bankBalance: number;
  signals: SignalData[];
  alerts: AlertData[];
  projects: ProjectData[];
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------
const DEMO_DATA: DashboardData = {
  bankBalance: 15200000,
  signals: [
    { month: '2026-02', predictedBalance: 15200000, signal: 'green' as const },
    { month: '2026-03', predictedBalance: 3800000, signal: 'yellow' as const },
    { month: '2026-04', predictedBalance: -1800000, signal: 'red' as const },
  ],
  alerts: [
    { type: 'warning' as const, title: '承認待ち支払申請', description: '3件の支払申請が承認待ちです（合計225万円）' },
    { type: 'danger' as const, title: '資金不足予測', description: '4月の予測残高が危険ラインを下回っています' },
  ],
  projects: [
    { id: '1', name: 'A現場（新宿ビル改修）', signal: 'green' as const, balance: 1700000, contractAmount: 12000000, incomeTotal: 4000000, expenseTotal: 2300000, incomeProgress: 0.33 },
    { id: '2', name: 'B現場（渋谷マンション）', signal: 'green' as const, balance: 800000, contractAmount: 8500000, incomeTotal: 2000000, expenseTotal: 1200000, incomeProgress: 0.24 },
    { id: '3', name: 'C現場（品川オフィス）', signal: 'yellow' as const, balance: 900000, contractAmount: 6000000, incomeTotal: 1500000, expenseTotal: 600000, incomeProgress: 0.25 },
    { id: '4', name: 'D現場（池袋商業施設）', signal: 'red' as const, balance: -200000, contractAmount: 15000000, incomeTotal: 0, expenseTotal: 200000, incomeProgress: 0 },
  ],
};

const DEMO_CHART: ChartPoint[] = [
  { date: '12/15', balance: 14500000, dangerLine: 2000000 },
  { date: '12/31', balance: 14800000, dangerLine: 2000000 },
  { date: '1/15', balance: 15500000, dangerLine: 2000000 },
  { date: '1/31', balance: 15200000, dangerLine: 2000000 },
  { date: '2/15', balance: 15200000, dangerLine: 2000000 },
  { date: '2/28', balance: 16000000, dangerLine: 2000000 },
  { date: '3/15', balance: 8000000, dangerLine: 2000000 },
  { date: '3/31', balance: 3800000, dangerLine: 2000000 },
  { date: '4/15', balance: 1000000, dangerLine: 2000000 },
  { date: '4/30', balance: -1800000, dangerLine: 2000000 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    return `${parseInt(parts[1], 10)}月`;
  }
  return monthStr;
}

function formatAmountShort(amount: number): string {
  const man = amount / 10000;
  if (man < 0) return `${man.toLocaleString('ja-JP')}万`;
  return `${man.toLocaleString('ja-JP')}万`;
}

function formatChartYAxis(value: number): string {
  const man = value / 10000;
  return `${man.toLocaleString('ja-JP')}万`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const balanceItem = payload.find((p) => p.dataKey === 'balance');
  return (
    <div
      style={{
        background: '#0C1929',
        border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 11,
        color: '#fff',
        boxShadow: '0 4px 16px rgba(12,25,41,0.3)',
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2, fontSize: 10 }}>{label}</p>
      {balanceItem && (
        <p style={{ fontWeight: 800, fontFamily: 'DM Sans, sans-serif', color: '#C9A84C' }}>
          {formatChartYAxis(balanceItem.value)}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [selectedSignalIndex, setSelectedSignalIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const data = await api.dashboard.get() as DashboardData & { chartData?: ChartPoint[] };
        if (!cancelled && data) {
          setDashboardData(data);
          if (data.chartData) {
            setChartData(data.chartData);
          } else {
            setChartData(DEMO_CHART);
          }
        }
      } catch {
        // Fallback to demo data when API is not available
        if (!cancelled) {
          setDashboardData(DEMO_DATA);
          setChartData(DEMO_CHART);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignalSelect = useCallback((index: number) => {
    setSelectedSignalIndex(index);
  }, []);

  const handleProjectClick = useCallback((project: ProjectData) => {
    setSelectedProject(project);
  }, []);

  const handleBottomSheetClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Loading state
  if (loading || !dashboardData) {
    return (
      <main className="pb-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div
              className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"
              style={{ borderWidth: 3 }}
            />
            <p className="text-sub text-sm">読み込み中...</p>
          </div>
        </div>
      </main>
    );
  }

  const currentDate = formatDate(new Date().toISOString());

  return (
    <main className="pb-20">
      {/* ============================================================= */}
      {/* 1. Balance Card Section                                        */}
      {/* ============================================================= */}
      <section className="relative overflow-hidden rounded-b-[20px] mb-3"
        style={{
          background: 'linear-gradient(145deg, #0c1929 0%, #152440 40%, #1a3058 70%, #1e3966 100%)',
          boxShadow: '0 8px 32px rgba(12,25,41,0.4)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
        }}
      >
        {/* Decorative glow */}
        <div className="absolute -top-[60px] -right-[30px] w-[160px] h-[160px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-[40px] -left-[20px] w-[120px] h-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)' }} />

        {/* Header Row */}
        <div className="flex items-center justify-between px-[18px] pt-3 pb-0 relative z-10"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col leading-none">
              <span className="text-white text-[16px] font-extrabold tracking-[0.04em]">カネミエル</span>
              <span className="text-gold text-[10px] font-semibold tracking-[0.16em] mt-[1px]"
                style={{ fontFamily: 'Cormorant Garamond, serif', textTransform: 'uppercase' }}>
                KANEMIEL
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center relative transition-all"
              style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              <svg className="w-[15px] h-[15px] text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {dashboardData.alerts.length > 0 && (
                <span className="absolute -top-[3px] -right-[3px] min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-[8px] font-extrabold text-white px-[3px]"
                  style={{ background: '#E04343', border: '1.5px solid #0C1929' }}>
                  {dashboardData.alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Balance Content */}
        <div className="px-[22px] pt-4 pb-5 relative z-10">
          <div className="flex items-center justify-between mb-[2px]">
            <span className="text-[11px] font-medium tracking-[0.03em]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              会社全体の残高
            </span>
            <span className="text-[9px] font-semibold px-2 py-[2px] rounded-[10px]"
              style={{
                color: '#C9A84C',
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
              LIVE
            </span>
          </div>

          <BalanceCard
            balance={dashboardData.bankBalance}
            label="会社全体の残高"
            date={currentDate}
          />

          <p className="text-[10px] mt-[2px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {currentDate} 時点
          </p>
        </div>
      </section>

      {/* Content area with padding */}
      <div className="px-[14px]">

        {/* ============================================================= */}
        {/* 2. Three Month Signal Section                                  */}
        {/* ============================================================= */}
        <section className="mb-3">
          <div className="flex items-center gap-[6px] mb-2">
            <h2 className="text-[13px] font-bold">3ヶ月シグナル</h2>
            <span className="text-sub text-[10px]">今後の予測残高</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {dashboardData.signals.map((sig, index) => (
              <div key={sig.month} onClick={() => handleSignalSelect(index)} className="cursor-pointer">
                <SignalCard
                  month={formatMonthLabel(sig.month)}
                  signal={sig.signal}
                  amount={formatAmountShort(sig.predictedBalance)}
                  selected={selectedSignalIndex === index}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* 3. Balance Trend Chart                                        */}
        {/* ============================================================= */}
        <section className="bg-card rounded-[14px] p-4 mb-3" style={{ boxShadow: '0 1px 4px rgba(12,25,41,0.06)' }}>
          <div className="flex items-center gap-[6px] mb-3">
            <h3 className="text-[12px] font-bold">残高推移</h3>
            <span className="text-sub text-[9px]">過去3ヶ月 + 予測</span>
          </div>

          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="#f0f2f6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#6B7A90', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tickFormatter={formatChartYAxis}
                  tick={{ fontSize: 8, fill: '#6B7A90', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={2000000}
                  stroke="#E04343"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  label={{
                    value: '危険ライン',
                    position: 'right',
                    fill: '#E04343',
                    fontSize: 8,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  fill="url(#balanceGradient)"
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#C9A84C"
                  strokeWidth={2.5}
                  dot={{ fill: '#C9A84C', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#C9A84C', r: 5, stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart legend */}
          <div className="flex items-center justify-center gap-[14px] mt-[10px]">
            <div className="flex items-center gap-1 text-[9px] text-sub font-medium">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: '#C9A84C' }} />
              残高推移
            </div>
            <div className="flex items-center gap-1 text-[9px] text-sub font-medium">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: '#E04343' }} />
              危険ライン
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 4. Alerts Section                                             */}
        {/* ============================================================= */}
        <section className="mb-3">
          <div className="flex items-center gap-[6px] mt-4 mb-2">
            <h2 className="text-[13px] font-bold">アラート</h2>
            {dashboardData.alerts.length > 0 && (
              <span
                className="text-[9px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-[5px]"
                style={{ background: '#E04343' }}
              >
                {dashboardData.alerts.length}
              </span>
            )}
          </div>

          {dashboardData.alerts.length === 0 ? (
            <div className="bg-card rounded-[11px] p-4 text-center" style={{ boxShadow: '0 1px 4px rgba(12,25,41,0.06)' }}>
              <p className="text-sub text-[12px]">アラートはありません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {dashboardData.alerts.map((alert, index) => (
                <AlertCard
                  key={index}
                  type={alert.type}
                  title={alert.title}
                  description={alert.description}
                />
              ))}
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* 5. Projects Section                                           */}
        {/* ============================================================= */}
        <section className="mb-6">
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="flex items-center gap-[6px]">
              <h2 className="text-[13px] font-bold">現場一覧</h2>
              <span className="text-sub text-[10px]">{dashboardData.projects.length}件</span>
            </div>
          </div>

          <div className="flex flex-col gap-[7px]">
            {dashboardData.projects.map((project) => (
              <ProjectCard
                key={project.id}
                name={project.name}
                signal={project.signal}
                balance={project.balance}
                contractAmount={project.contractAmount}
                incomeTotal={project.incomeTotal}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ============================================================= */}
      {/* 6. Project Detail BottomSheet                                  */}
      {/* ============================================================= */}
      <BottomSheet
        isOpen={selectedProject !== null}
        onClose={handleBottomSheetClose}
        title={selectedProject?.name ?? ''}
      >
        {selectedProject && (
          <div>
            {/* Project header with signal */}
            <div className="flex items-center gap-2 mb-4">
              <Signal status={selectedProject.signal} size="md" />
              <span className="text-[13px] font-bold">{selectedProject.name}</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* 契約金額 */}
              <div className="bg-bg rounded-[12px] p-3">
                <p className="text-sub text-[10px] font-medium mb-1">契約金額</p>
                <p className="text-[16px] font-extrabold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatYen(selectedProject.contractAmount)}
                </p>
              </div>

              {/* 入金済み */}
              <div className="bg-bg rounded-[12px] p-3">
                <p className="text-sub text-[10px] font-medium mb-1">入金済み</p>
                <p className="text-[16px] font-extrabold text-success" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatYen(selectedProject.incomeTotal)}
                </p>
              </div>

              {/* 支出済み */}
              <div className="bg-bg rounded-[12px] p-3">
                <p className="text-sub text-[10px] font-medium mb-1">支出済み</p>
                <p className="text-[16px] font-extrabold text-danger" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatYen(selectedProject.expenseTotal)}
                </p>
              </div>

              {/* 現場残高 */}
              <div className="bg-bg rounded-[12px] p-3">
                <p className="text-sub text-[10px] font-medium mb-1">現場残高</p>
                <p className={`text-[16px] font-extrabold ${selectedProject.balance < 0 ? 'text-danger' : ''}`}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatYen(selectedProject.balance)}
                </p>
              </div>
            </div>

            {/* Income progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-[6px]">
                <span className="text-sub text-[10px] font-medium">入金進捗</span>
                <span className="text-[11px] font-bold">{Math.round(selectedProject.incomeProgress * 100)}%</span>
              </div>
              <div className="h-[6px] bg-[#edf0f5] rounded-[3px] overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-all duration-500"
                  style={{
                    width: `${Math.min(selectedProject.incomeProgress * 100, 100)}%`,
                    background:
                      selectedProject.signal === 'green'
                        ? 'linear-gradient(90deg, #22B573, #4ade80)'
                        : selectedProject.signal === 'yellow'
                          ? 'linear-gradient(90deg, #E5A117, #facc15)'
                          : 'linear-gradient(90deg, #E04343, #f87171)',
                  }}
                />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleBottomSheetClose}
              className="w-full py-3 rounded-[12px] text-[13px] font-bold text-white transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0c1929, #1e3355)',
                boxShadow: '0 4px 16px rgba(12,25,41,0.2)',
              }}
            >
              閉じる
            </button>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
