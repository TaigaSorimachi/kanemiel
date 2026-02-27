"use client";

import { useState, useMemo, useCallback } from "react";
import Signal from "@/components/ui/Signal";
import SuccessOverlay from "@/components/ui/SuccessOverlay";
import { formatYen } from "@/components/format";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "payment" | "income";
type SignalStatus = "green" | "yellow" | "red";

interface SelectOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------
const DEMO_PROJECTS: SelectOption[] = [
  { id: "1", name: "A現場" },
  { id: "2", name: "B現場" },
  { id: "3", name: "C現場" },
  { id: "4", name: "D現場" },
];

const DEMO_SUBCONTRACTORS: SelectOption[] = [
  { id: "1", name: "鈴木工業" },
  { id: "2", name: "中村左官店" },
  { id: "3", name: "高橋材木店" },
];

const DEMO_CONTRACTORS: SelectOption[] = [
  { id: "1", name: "大手建設株式会社" },
  { id: "2", name: "東京ハウジング株式会社" },
];

// Demo balance per project for impact preview
const DEMO_BALANCES: Record<string, number> = {
  "1": 1700000,
  "2": 800000,
  "3": 900000,
  "4": 2400000,
};

const CATEGORY_OPTIONS = [
  { value: "SUBCONTRACTING", label: "外注費", icon: "👷" },
  { value: "MATERIAL", label: "材料費", icon: "🧱" },
  { value: "EQUIPMENT", label: "機材", icon: "🚜" },
  { value: "TRANSPORT", label: "交通費", icon: "🚗" },
  { value: "OTHER", label: "その他", icon: "📦" },
] as const;

const INCOME_TYPE_OPTIONS = [
  { value: "PROGRESS", label: "出来高", icon: "📄" },
  { value: "ADVANCE", label: "前受金", icon: "💰" },
  { value: "FINAL", label: "最終金", icon: "✅" },
] as const;

const QUICK_AMOUNTS = [100000, 300000, 500000, 800000, 1000000, 1500000];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getNextMonth15th(): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const d = new Date(year, month, 15);
  return d.toISOString().split("T")[0];
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateSignal(balance: number, dangerLine: number): SignalStatus {
  if (balance > dangerLine * 2) return "green";
  if (balance > dangerLine) return "yellow";
  return "red";
}

function formatQuickAmount(amount: number): string {
  return `${amount / 10000}万`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InputPage() {
  const [activeTab, setActiveTab] = useState<Tab>("payment");

  // ---- Payment form state ----
  const [payProjectId, setPayProjectId] = useState<string | null>(null);
  const [payClientId, setPayClientId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAmountInput, setPayAmountInput] = useState<string>("");
  const [payDate, setPayDate] = useState(getNextMonth15th());
  const [payCategory, setPayCategory] = useState<string | null>(null);
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // ---- Income form state ----
  const [incProjectId, setIncProjectId] = useState<string | null>(null);
  const [incClientId, setIncClientId] = useState<string | null>(null);
  const [incAmount, setIncAmount] = useState<number>(0);
  const [incAmountInput, setIncAmountInput] = useState<string>("");
  const [incDate, setIncDate] = useState(getTodayString());
  const [incType, setIncType] = useState<string | null>(null);
  const [incSubmitting, setIncSubmitting] = useState(false);

  // ---- Success overlay ----
  const [successOverlay, setSuccessOverlay] = useState({ show: false, message: "" });

  // ---- Payment impact preview ----
  const paymentImpact = useMemo(() => {
    if (!payProjectId || payAmount <= 0) return null;
    const currentBalance = DEMO_BALANCES[payProjectId] ?? 0;
    const afterBalance = currentBalance - payAmount;
    const dangerLine = 300000; // demo danger line
    const signal = calculateSignal(afterBalance, dangerLine);
    return { afterBalance, signal };
  }, [payProjectId, payAmount]);

  // ---- Payment validation ----
  const paymentValid = payProjectId && payClientId && payAmount > 0 && payDate && payCategory;

  // ---- Income validation ----
  const incomeValid = incProjectId && incClientId && incAmount > 0 && incDate && incType;

  // ---- Handlers ----
  const handleAmountChange = useCallback(
    (value: string, setter: (v: string) => void, numSetter: (v: number) => void) => {
      // Allow only digits
      const cleaned = value.replace(/[^0-9]/g, "");
      setter(cleaned);
      numSetter(cleaned ? parseInt(cleaned, 10) : 0);
    },
    []
  );

  const handleQuickAmount = useCallback(
    (amount: number) => {
      setPayAmount(amount);
      setPayAmountInput(String(amount));
    },
    []
  );

  const resetPaymentForm = useCallback(() => {
    setPayProjectId(null);
    setPayClientId(null);
    setPayAmount(0);
    setPayAmountInput("");
    setPayDate(getNextMonth15th());
    setPayCategory(null);
    setPayNote("");
  }, []);

  const resetIncomeForm = useCallback(() => {
    setIncProjectId(null);
    setIncClientId(null);
    setIncAmount(0);
    setIncAmountInput("");
    setIncDate(getTodayString());
    setIncType(null);
  }, []);

  const handlePaymentSubmit = useCallback(async () => {
    if (!paymentValid) return;
    setPaySubmitting(true);
    try {
      await api.payments.create({
        projectId: payProjectId,
        clientId: payClientId,
        amount: payAmount,
        desiredDate: payDate,
        category: payCategory,
        note: payNote || undefined,
      });
    } catch {
      // API unavailable -- show success anyway for demo
    }
    setPaySubmitting(false);
    setSuccessOverlay({ show: true, message: "支払申請を送信しました" });
    resetPaymentForm();
  }, [paymentValid, payProjectId, payClientId, payAmount, payDate, payCategory, payNote, resetPaymentForm]);

  const handleIncomeSubmit = useCallback(async () => {
    if (!incomeValid) return;
    setIncSubmitting(true);
    try {
      await api.transactions.registerIncome({
        projectId: incProjectId,
        clientId: incClientId,
        amount: incAmount,
        date: incDate,
        type: incType,
      });
    } catch {
      // API unavailable -- show success anyway for demo
    }
    setIncSubmitting(false);
    setSuccessOverlay({ show: true, message: "入金を登録しました" });
    resetIncomeForm();
  }, [incomeValid, incProjectId, incClientId, incAmount, incDate, incType, resetIncomeForm]);

  return (
    <main className="pb-24 p-4">
      {/* Success Overlay */}
      <SuccessOverlay
        show={successOverlay.show}
        message={successOverlay.message}
        onClose={() => setSuccessOverlay({ show: false, message: "" })}
      />

      {/* ---- Tab Toggle ---- */}
      <div className="flex mb-6 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("payment")}
          className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
            activeTab === "payment"
              ? "text-navy border-b-2 border-gold"
              : "text-sub"
          }`}
        >
          支払申請
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("income")}
          className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
            activeTab === "income"
              ? "text-navy border-b-2 border-gold"
              : "text-sub"
          }`}
        >
          入金登録
        </button>
      </div>

      {/* ================================================================== */}
      {/* PAYMENT REQUEST FORM                                               */}
      {/* ================================================================== */}
      {activeTab === "payment" && (
        <div className="flex flex-col gap-6">
          {/* --- 1. Project Selection --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">現場選択</label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROJECTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPayProjectId(p.id)}
                  className={`min-h-[48px] rounded-xl text-sm font-bold transition-colors ${
                    payProjectId === p.id
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          {/* --- 2. Subcontractor Selection --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">支払先</label>
            <div className="flex flex-col gap-2">
              {DEMO_SUBCONTRACTORS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPayClientId(s.id)}
                  className={`min-h-[48px] rounded-xl text-sm font-bold text-left px-4 transition-colors ${
                    payClientId === s.id
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button
                type="button"
                className="min-h-[48px] rounded-xl text-sm font-medium text-gold border-2 border-dashed border-gold/40 active:bg-gold/5"
              >
                ＋ 新規追加
              </button>
            </div>
          </section>

          {/* --- 3. Amount Input --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">金額入力</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sub text-lg">¥</span>
              <input
                type="text"
                inputMode="numeric"
                value={payAmountInput}
                onChange={(e) => handleAmountChange(e.target.value, setPayAmountInput, setPayAmount)}
                placeholder="0"
                className="w-full min-h-[56px] rounded-xl border border-border text-right text-xl font-bold pr-4 pl-10 focus:outline-none focus:border-gold"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className={`min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                    payAmount === amt
                      ? "bg-gold/20 text-gold-dark border border-gold"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  {formatQuickAmount(amt)}
                </button>
              ))}
            </div>

            {/* Impact preview */}
            {paymentImpact && (
              <div
                className={`mt-3 rounded-xl p-3 flex items-center gap-2 ${
                  paymentImpact.signal === "green"
                    ? "bg-success-bg"
                    : paymentImpact.signal === "yellow"
                    ? "bg-warning-bg"
                    : "bg-danger-bg"
                }`}
              >
                <Signal status={paymentImpact.signal} size="sm" />
                <span className="text-xs font-medium text-navy">
                  承認後の現場残高: {formatYen(paymentImpact.afterBalance)}
                </span>
              </div>
            )}
          </section>

          {/* --- 4. Desired Date --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">支払希望日</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-border px-4 text-sm focus:outline-none focus:border-gold"
            />
          </section>

          {/* --- 5. Category --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">区分</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setPayCategory(cat.value)}
                  className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
                    payCategory === cat.value
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* --- 6. Notes --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">備考（任意）</label>
            <textarea
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="支払に関するメモ"
              rows={3}
              className="w-full rounded-xl border border-border p-3 text-sm focus:outline-none focus:border-gold resize-none"
            />
          </section>

          {/* --- Submit Button --- */}
          <button
            type="button"
            disabled={!paymentValid || paySubmitting}
            onClick={handlePaymentSubmit}
            className="w-full min-h-[56px] rounded-xl bg-gold text-white font-bold text-base transition-colors active:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paySubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "支払申請を送信"
            )}
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* INCOME REGISTRATION FORM                                           */}
      {/* ================================================================== */}
      {activeTab === "income" && (
        <div className="flex flex-col gap-6">
          {/* --- 1. Project Selection --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">現場選択</label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROJECTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setIncProjectId(p.id)}
                  className={`min-h-[48px] rounded-xl text-sm font-bold transition-colors ${
                    incProjectId === p.id
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          {/* --- 2. Contractor (Payment Source) --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">入金元</label>
            <div className="flex flex-col gap-2">
              {DEMO_CONTRACTORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setIncClientId(c.id)}
                  className={`min-h-[48px] rounded-xl text-sm font-bold text-left px-4 transition-colors ${
                    incClientId === c.id
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                className="min-h-[48px] rounded-xl text-sm font-medium text-gold border-2 border-dashed border-gold/40 active:bg-gold/5"
              >
                ＋ 新規追加
              </button>
            </div>
          </section>

          {/* --- 3. Amount Input --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">金額入力</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sub text-lg">¥</span>
              <input
                type="text"
                inputMode="numeric"
                value={incAmountInput}
                onChange={(e) => handleAmountChange(e.target.value, setIncAmountInput, setIncAmount)}
                placeholder="0"
                className="w-full min-h-[56px] rounded-xl border border-border text-right text-xl font-bold pr-4 pl-10 focus:outline-none focus:border-gold"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
          </section>

          {/* --- 4. Income Date --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">入金日</label>
            <input
              type="date"
              value={incDate}
              onChange={(e) => setIncDate(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-border px-4 text-sm focus:outline-none focus:border-gold"
            />
          </section>

          {/* --- 5. Income Type --- */}
          <section>
            <label className="block text-xs font-bold text-sub mb-2">種別</label>
            <div className="grid grid-cols-3 gap-2">
              {INCOME_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIncType(opt.value)}
                  className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${
                    incType === opt.value
                      ? "bg-navy text-white"
                      : "bg-card border border-border text-navy active:bg-bg"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* --- Submit Button --- */}
          <button
            type="button"
            disabled={!incomeValid || incSubmitting}
            onClick={handleIncomeSubmit}
            className="w-full min-h-[56px] rounded-xl bg-gold text-white font-bold text-base transition-colors active:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {incSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "入金を登録"
            )}
          </button>
        </div>
      )}
    </main>
  );
}
