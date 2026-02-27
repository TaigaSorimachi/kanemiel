const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error(json.message || "API Error");
  }

  return json.data;
}

export const api = {
  dashboard: {
    get: () => fetchAPI("/dashboard"),
    signals: () => fetchAPI("/dashboard/signals"),
    chart: () => fetchAPI("/dashboard/chart"),
    alerts: () => fetchAPI("/dashboard/alerts"),
  },
  projects: {
    list: () => fetchAPI("/projects"),
    get: (id: string) => fetchAPI(`/projects/${id}`),
    timeline: (id: string) => fetchAPI(`/projects/${id}/timeline`),
  },
  payments: {
    pending: () => fetchAPI("/payment-requests/pending"),
    create: (data: Record<string, unknown>) =>
      fetchAPI("/payment-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    approve: (id: string) =>
      fetchAPI(`/payment-requests/${id}/approve`, { method: "POST" }),
    reject: (id: string, comment?: string) =>
      fetchAPI(`/payment-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    impact: (id: string) => fetchAPI(`/payment-requests/${id}/impact`),
  },
  transactions: {
    list: (params?: Record<string, string>) =>
      fetchAPI(
        `/transactions?${new URLSearchParams(params || {}).toString()}`
      ),
    registerIncome: (data: Record<string, unknown>) =>
      fetchAPI("/transactions/income", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    incomeSchedules: () => fetchAPI("/income-schedules"),
  },
  reports: {
    summary: () => fetchAPI("/reports/summary"),
    byProject: () => fetchAPI("/reports/by-project"),
    cashflowTable: () => fetchAPI("/reports/cashflow-table"),
  },
  notifications: {
    list: () => fetchAPI("/notifications"),
    markRead: (id: string) =>
      fetchAPI(`/notifications/${id}/read`, { method: "PATCH" }),
  },
  clients: {
    list: (type?: string) =>
      fetchAPI(`/clients${type ? `?type=${type}` : ""}`),
    create: (data: Record<string, unknown>) =>
      fetchAPI("/clients", { method: "POST", body: JSON.stringify(data) }),
  },
  auth: {
    line: (accessToken: string) =>
      fetchAPI("/auth/line", {
        method: "POST",
        body: JSON.stringify({ accessToken }),
      }),
    me: () => fetchAPI("/auth/me"),
  },
};
