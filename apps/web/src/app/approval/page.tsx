"use client";

import { useState, useCallback } from "react";
import Signal from "@/components/ui/Signal";
import Toast from "@/components/ui/Toast";
import { formatYen } from "@/components/format";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SignalStatus = "green" | "yellow" | "red";

interface PaymentImpact {
  projectBalanceAfter: number;
  projectSignalAfter: SignalStatus;
  companyBalanceAfter: number;
  companySignalAfter: SignalStatus;
}

interface PendingPayment {
  id: string;
  projectName: string;
  clientName: string;
  amount: number;
  category: string;
  desiredDate: string;
  requesterName: string;
  status: string;
  impact: PaymentImpact;
}

// ---------------------------------------------------------------------------
// Demo data (fallback when API unavailable)
// ---------------------------------------------------------------------------
const DEMO_PENDING: PendingPayment[] = [
  {
    id: "1",
    projectName: "A現場（新宿ビル改修）",
    clientName: "鈴木工業",
    amount: 800000,
    category: "SUBCONTRACTING",
    desiredDate: "2026-03-15",
    requesterName: "田中一郎",
    status: "PENDING",
    impact: {
      projectBalanceAfter: 900000,
      projectSignalAfter: "yellow",
      companyBalanceAfter: 14400000,
      companySignalAfter: "green",
    },
  },
  {
    id: "2",
    projectName: "B現場（渋谷マンション）",
    clientName: "中村左官店",
    amount: 1000000,
    category: "SUBCONTRACTING",
    desiredDate: "2026-03-15",
    requesterName: "田中一郎",
    status: "PENDING",
    impact: {
      projectBalanceAfter: -200000,
      projectSignalAfter: "red",
      companyBalanceAfter: 13400000,
      companySignalAfter: "green",
    },
  },
  {
    id: "3",
    projectName: "C現場（品川オフィス）",
    clientName: "高橋材木店",
    amount: 450000,
    category: "MATERIAL",
    desiredDate: "2026-03-10",
    requesterName: "田中一郎",
    status: "PENDING",
    impact: {
      projectBalanceAfter: 450000,
      projectSignalAfter: "yellow",
      companyBalanceAfter: 12950000,
      companySignalAfter: "green",
    },
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  SUBCONTRACTING: "外注費",
  MATERIAL: "材料費",
  EQUIPMENT: "機材費",
  TRANSPORT: "交通費",
  OTHER: "その他",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function signalBgClass(status: SignalStatus): string {
  switch (status) {
    case "green":
      return "bg-success-bg";
    case "yellow":
      return "bg-warning-bg";
    case "red":
      return "bg-danger-bg";
  }
}

function formatDesiredDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ApprovalPage() {
  const [items, setItems] = useState<PendingPayment[]>(DEMO_PENDING);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<Record<string, "approve" | "reject" | null>>({});
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });

  // Computed
  const pendingCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const showToast = useCallback((message: string) => {
    setToast({ show: false, message: "" });
    // Force re-render cycle so Toast component re-mounts
    requestAnimationFrame(() => {
      setToast({ show: true, message });
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setFadingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }, []);

  // --- Approve ---
  const handleApprove = useCallback(
    async (id: string) => {
      setLoadingAction((prev) => ({ ...prev, [id]: "approve" }));
      try {
        await api.payments.approve(id);
      } catch {
        // API unavailable — continue with demo behaviour
      }
      setLoadingAction((prev) => ({ ...prev, [id]: null }));
      showToast("承認しました");
      removeCard(id);
    },
    [showToast, removeCard]
  );

  // --- Reject ---
  const openRejectDialog = useCallback((id: string) => {
    setRejectTargetId(id);
    setRejectComment("");
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectTargetId) return;
    const id = rejectTargetId;
    setLoadingAction((prev) => ({ ...prev, [id]: "reject" }));
    setRejectTargetId(null);
    try {
      await api.payments.reject(id, rejectComment || undefined);
    } catch {
      // API unavailable — continue with demo behaviour
    }
    setLoadingAction((prev) => ({ ...prev, [id]: null }));
    showToast("差戻ししました");
    removeCard(id);
    setRejectComment("");
  }, [rejectTargetId, rejectComment, showToast, removeCard]);

  return (
    <main className="pb-20 p-4">
      {/* Toast */}
      <Toast message={toast.message} show={toast.show} />

      {/* ---- Summary Bar ---- */}
      <div className="bg-navy rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gold font-bold text-base">承認待ち</span>
          <span className="bg-gold text-navy text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {pendingCount}
          </span>
          <span className="text-gold text-xs">件</span>
        </div>
        <p className="text-white text-sm font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          合計 {formatYen(totalAmount)}
        </p>
      </div>

      {/* ---- Empty State ---- */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-sub">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">承認待ちの申請はありません</p>
        </div>
      )}

      {/* ---- Approval Cards ---- */}
      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const isFading = fadingIds.has(item.id);
          const action = loadingAction[item.id] ?? null;

          return (
            <div
              key={item.id}
              className={`bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-400 ${
                isFading ? "opacity-0 translate-x-8 max-h-0 mb-0 border-0 p-0" : "opacity-100 max-h-[600px]"
              }`}
              style={{ transitionProperty: "opacity, transform, max-height, margin, padding" }}
            >
              {/* Card Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start gap-3">
                  {/* Gold dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-gold mt-1.5 shrink-0" />

                  <div className="flex-1 min-w-0">
                    {/* Project name */}
                    <p className="text-sm font-bold text-navy truncate">{item.projectName}</p>

                    {/* Client + category */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sub text-xs truncate">{item.clientName}</span>
                      <span className="text-[10px] font-medium bg-navy/8 text-navy-mid px-2 py-0.5 rounded-full shrink-0">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <p
                    className="text-lg font-bold text-navy shrink-0"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {formatYen(item.amount)}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 mt-2 ml-5 text-sub text-[11px]">
                  <span>希望日: {formatDesiredDate(item.desiredDate)}</span>
                  <span>申請者: {item.requesterName}</span>
                </div>
              </div>

              {/* ---- Impact Preview Box ---- */}
              <div
                className={`mx-4 mb-3 rounded-xl p-3 ${signalBgClass(
                  // Use the worse signal of the two
                  item.impact.projectSignalAfter === "red" || item.impact.companySignalAfter === "red"
                    ? "red"
                    : item.impact.projectSignalAfter === "yellow" || item.impact.companySignalAfter === "yellow"
                    ? "yellow"
                    : "green"
                )}`}
              >
                <p className="text-[10px] text-sub mb-2 font-medium">承認後の影響</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Project balance */}
                  <div className="flex items-center gap-2">
                    <Signal status={item.impact.projectSignalAfter} size="sm" />
                    <div>
                      <p className="text-[10px] text-sub">現場残高</p>
                      <p className="text-xs font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {formatYen(item.impact.projectBalanceAfter)}
                      </p>
                    </div>
                  </div>

                  {/* Company balance */}
                  <div className="flex items-center gap-2">
                    <Signal status={item.impact.companySignalAfter} size="sm" />
                    <div>
                      <p className="text-[10px] text-sub">会社残高</p>
                      <p className="text-xs font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {formatYen(item.impact.companyBalanceAfter)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- Action Buttons ---- */}
              <div className="flex gap-3 px-4 pb-4">
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => openRejectDialog(item.id)}
                  className="flex-1 min-h-[48px] rounded-xl border-2 border-danger text-danger font-bold text-sm transition-colors active:bg-danger/10 disabled:opacity-50"
                >
                  {action === "reject" ? (
                    <span className="inline-block w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "差戻し"
                  )}
                </button>
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => handleApprove(item.id)}
                  className="flex-1 min-h-[48px] rounded-xl bg-navy text-gold font-bold text-sm transition-colors active:bg-navy-light disabled:opacity-50"
                >
                  {action === "approve" ? (
                    <span className="inline-block w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "承認"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Reject Comment Modal ---- */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-navy/50">
          <div className="w-full max-w-[430px] bg-card rounded-t-2xl p-5 animate-slide-up">
            <p className="text-sm font-bold mb-3 text-navy">差戻しコメント</p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="差戻しの理由を入力（任意）"
              rows={3}
              className="w-full border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectTargetId(null)}
                className="flex-1 min-h-[48px] rounded-xl border border-border text-sub font-medium text-sm active:bg-bg"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 min-h-[48px] rounded-xl bg-danger text-white font-bold text-sm active:bg-danger/90"
              >
                差戻しする
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
