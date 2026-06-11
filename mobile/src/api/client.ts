import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";

const TOKEN_KEY = "auth_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await clearToken();
    throw new ApiError("Session expired", 401);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message || `Request failed (${res.status})`,
      res.status,
      data
    );
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Auth ────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: any }>("/api/auth/mobile", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  return data;
}

export async function verifyToken() {
  return request<{ valid: boolean; user: any }>("/api/auth/mobile");
}

export async function logout() {
  await clearToken();
}

// ─── Dashboard ───────────────────────────────────────────

export async function fetchDashboard() {
  return request<{
    success: boolean;
    balances: { checking: number; savings: number; investment: number; total: number };
    transactions: any[];
    user: any;
  }>("/api/mobile/dashboard");
}

// ─── Transactions ────────────────────────────────────────

export async function fetchTransactions(params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  accountType?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.type) qs.set("type", params.type);
  if (params?.status) qs.set("status", params.status);
  if (params?.accountType) qs.set("accountType", params.accountType);
  const query = qs.toString();
  return request<{
    success: boolean;
    transactions: any[];
    pagination: { page: number; limit: number; total: number; pages: number; hasMore: boolean };
  }>(`/api/mobile/transactions${query ? `?${query}` : ""}`);
}

// ─── Transfers ───────────────────────────────────────────

export async function initiateTransfer(payload: Record<string, unknown>) {
  return request<{ success: boolean; reference?: string; transfer?: any }>(
    "/api/mobile/transfers",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function fetchTransferHistory() {
  return request<{ success: boolean; transactions: any[] }>("/api/mobile/transfers/dashboard");
}

// ─── Deposits ────────────────────────────────────────────

export async function submitDeposit(payload: {
  amount: number;
  accountType: string;
  checkFrontImage: string;
  checkBackImage: string;
}) {
  return request<{ success: boolean; deposit: any }>("/api/mobile/deposits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
