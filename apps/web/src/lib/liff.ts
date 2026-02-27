'use client';

import liff from '@line/liff';

let initialized = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    console.warn('LIFF ID not configured, skipping LIFF init');
    return;
  }
  await liff.init({ liffId });
  initialized = true;
}

export function isLoggedIn(): boolean {
  if (!initialized) return false;
  return liff.isLoggedIn();
}

export function login(): void {
  liff.login();
}

export function logout(): void {
  liff.logout();
  localStorage.removeItem('token');
  window.location.reload();
}

export async function getAccessToken(): Promise<string | null> {
  if (!initialized) return null;
  return liff.getAccessToken();
}

export async function getProfile() {
  if (!initialized) return null;
  return liff.getProfile();
}

export { liff };
