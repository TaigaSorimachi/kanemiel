'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/liff';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'owner' | 'accounting' | 'foreman';

const ROLE_CONFIG: Record<Role, { label: string; badge: string }> = {
  owner: { label: '経営者', badge: 'bg-gold text-navy' },
  accounting: { label: '経理', badge: 'bg-navy-light text-white' },
  foreman: { label: '現場監督', badge: 'bg-sub text-white' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredRole(): Role {
  if (typeof window === 'undefined') return 'owner';
  return (localStorage.getItem('kanemiel_role') as Role) ?? 'owner';
}

function getStoredNotification(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('kanemiel_notification');
  return stored === null ? true : stored === 'true';
}

function getStoredDangerLine(): number {
  if (typeof window === 'undefined') return 500;
  const stored = localStorage.getItem('kanemiel_danger_line');
  return stored ? Number(stored) : 500;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>('owner');
  const [notification, setNotification] = useState(true);
  const [dangerLine, setDangerLine] = useState(500);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe initialization from localStorage
  useEffect(() => {
    setRole(getStoredRole());
    setNotification(getStoredNotification());
    setDangerLine(getStoredDangerLine());
    setMounted(true);
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('kanemiel_role', newRole);
  };

  const handleNotificationToggle = () => {
    const next = !notification;
    setNotification(next);
    localStorage.setItem('kanemiel_notification', String(next));
  };

  const handleDangerLineChange = (value: string) => {
    const num = Number(value);
    if (!isNaN(num) && num >= 0) {
      setDangerLine(num);
      localStorage.setItem('kanemiel_danger_line', String(num));
    }
  };

  const currentConfig = ROLE_CONFIG[role];

  return (
    <main className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-6 pb-4">
        <h1 className="text-white text-lg font-bold">設定</h1>
        <p className="text-white/60 text-xs mt-0.5">アカウント・通知・アプリ設定</p>
      </div>

      <div className="p-4 space-y-4">
        {/* ---- Role Display ---- */}
        <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-sub mb-2">現在のロール</p>
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">{user?.name ?? 'デモユーザー'}</p>
              {mounted && (
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentConfig.badge}`}
                >
                  {currentConfig.label}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ---- Role Switcher ---- */}
        <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-sub mb-3">ロール切替（デモ用）</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(ROLE_CONFIG) as [Role, { label: string; badge: string }][]).map(
              ([key, config]) => {
                const isActive = role === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleRoleChange(key)}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-navy text-gold border-2 border-gold'
                        : 'bg-bg text-sub border-2 border-transparent hover:border-border'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* ---- LINE Notification Toggle ---- */}
        <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">LINE通知</p>
              <p className="text-xs text-sub mt-0.5">危険シグナル・承認依頼を通知</p>
            </div>
            <button
              onClick={handleNotificationToggle}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                notification ? 'bg-gold' : 'bg-border'
              }`}
              role="switch"
              aria-checked={notification}
              aria-label="LINE通知"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  notification ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs mt-2 font-medium">
            {mounted && (
              <span className={notification ? 'text-gold' : 'text-sub'}>
                {notification ? 'ON' : 'OFF'}
              </span>
            )}
          </p>
        </section>

        {/* ---- Danger Line ---- */}
        <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <p className="text-sm font-semibold mb-1">危険ライン</p>
          <p className="text-xs text-sub mb-3">残高がこの金額を下回ると赤シグナルになります</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                value={mounted ? dangerLine : 500}
                onChange={(e) => handleDangerLineChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm font-semibold text-navy focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>
            <span className="text-sm font-semibold text-sub">万円</span>
          </div>
          {mounted && (
            <p className="text-xs text-sub mt-2">
              現在の設定: {dangerLine.toLocaleString()}万円 (= ¥{(dangerLine * 10000).toLocaleString()})
            </p>
          )}
        </section>

        {/* ---- App Info ---- */}
        <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <p className="text-sm font-semibold mb-3">アプリ情報</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-sub">Version</span>
              <span className="text-xs font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                0.1.0
              </span>
            </div>
            <div className="border-t border-border" />
            <div className="text-center pt-2">
              <p
                className="text-gold font-bold text-lg"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                KANEMIEL
              </p>
              <p className="text-xs text-sub mt-1">カネミエル - Guardian of your cash flow</p>
            </div>
          </div>
        </section>

        {/* ---- LINE Logout ---- */}
        <section className="pt-2">
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl bg-red/10 text-red text-sm font-semibold border border-red/20 hover:bg-red/20 transition-colors"
          >
            LINEでログアウト
          </button>
        </section>
      </div>
    </main>
  );
}
