/**
 * Aldwych European Capital — Banking API Service Layer
 * 
 * Connects the mobile app directly to the Alwayd web application's
 * mobile API endpoints. Uses JWT Bearer token authentication.
 * 
 * Endpoints consumed:
 * - POST /api/auth/mobile        → Login (email/password → JWT)
 * - GET  /api/auth/mobile        → Verify token / get user
 * - GET  /api/mobile/dashboard   → Balances + recent transactions
 * - GET  /api/mobile/transactions → Full transaction history (paginated)
 * - POST /api/mobile/transfers   → Initiate transfer
 * - GET  /api/mobile/transfers   → Transfer history
 * - GET  /api/bills              → Bills
 * - GET  /api/loans              → Loans
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Configuration ───────────────────────────────────────────────────────────

const WEB_APP_BASE_URL_KEY = "aldwych_web_app_url";
const AUTH_TOKEN_KEY = "aldwych_auth_token";
const USER_DATA_KEY = "aldwych_user_data";

// Default to the deployed Alwayd web app URL
// This should be configured via settings or environment variable
let _baseUrl = process.env.EXPO_PUBLIC_ALWAYD_API_URL || "";

export function setBaseUrl(url: string) {
  _baseUrl = url.replace(/\/$/, "");
  AsyncStorage.setItem(WEB_APP_BASE_URL_KEY, _baseUrl);
}

export async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl;
  const stored = await AsyncStorage.getItem(WEB_APP_BASE_URL_KEY);
  if (stored) {
    _baseUrl = stored;
    return stored;
  }
  return "";
}

// ─── Token Management ────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
}

// ─── User Data Cache ─────────────────────────────────────────────────────────

export async function getCachedUser(): Promise<BankUser | null> {
  try {
    if (Platform.OS === "web") {
      const data = window.localStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    }
    const data = await SecureStore.getItemAsync(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setCachedUser(user: BankUser): Promise<void> {
  const data = JSON.stringify(user);
  if (Platform.OS === "web") {
    window.localStorage.setItem(USER_DATA_KEY, data);
  } else {
    await SecureStore.setItemAsync(USER_DATA_KEY, data);
  }
}

async function clearCachedUser(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(USER_DATA_KEY);
  } else {
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BankUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  accountNumber?: string;
  routingNumber?: string;
  balance: number;
  checkingBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  verified?: boolean;
  role?: string;
}

export interface BankBalances {
  checking: number;
  savings: number;
  investment: number;
  total: number;
}

export interface BankTransaction {
  _id: string;
  reference: string;
  type: string;
  amount: number;
  rawAmount?: number;
  description: string;
  status: string;
  date: string;
  createdAt?: string;
  accountType: string;
  posted?: boolean;
  currency?: string;
}

export interface TransferRequest {
  type: "internal" | "external" | "wire" | "international";
  fromAccount: string;
  toAccount?: string;
  recipientAccount?: string;
  recipientName?: string;
  recipientBank?: string;
  recipientRoutingNumber?: string;
  swiftCode?: string;
  country?: string;
  amount: number;
  description?: string;
}

export interface TransferResult {
  success: boolean;
  message?: string;
  reference?: string;
  error?: string;
  transfer?: {
    id: string;
    reference: string;
    type: string;
    amount: number;
    status: string;
    fromAccount: string;
    toAccount?: string;
    recipientName?: string;
    date: string;
  };
}

export interface DashboardData {
  balances: BankBalances;
  transactions: BankTransaction[];
  user: BankUser;
}

export interface TransactionListResponse {
  transactions: BankTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
  balances: BankBalances;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  if (!baseUrl) {
    throw new Error("Banking API URL not configured. Please set your web app URL in Settings.");
  }

  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    await removeToken();
    await clearCachedUser();
    throw new AuthError("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      // Use default message
    }
    throw new ApiError(errorMessage, response.status);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return {} as T;
}

// ─── Error Classes ───────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ─── Authentication ──────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<{ user: BankUser; token: string }> {
  const baseUrl = await getBaseUrl();
  if (!baseUrl) {
    throw new Error("Banking API URL not configured. Please set your web app URL in Settings.");
  }

  const response = await fetch(`${baseUrl}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new AuthError(data.error || "Login failed");
  }

  // Store token and user data
  await setToken(data.token);
  await setCachedUser(data.user);

  return { user: data.user, token: data.token };
}

export async function verifyToken(): Promise<BankUser | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    const data = await request<{ success: boolean; user: BankUser }>("/api/auth/mobile");
    if (data.success && data.user) {
      await setCachedUser(data.user);
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await removeToken();
  await clearCachedUser();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  const data = await request<{ success: boolean } & DashboardData>("/api/mobile/dashboard");
  if (data.user) {
    await setCachedUser(data.user);
  }
  return {
    balances: data.balances,
    transactions: data.transactions,
    user: data.user,
  };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(params?: {
  page?: number;
  limit?: number;
  type?: string;
  accountType?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}): Promise<TransactionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.type) searchParams.set("type", params.type);
  if (params?.accountType) searchParams.set("accountType", params.accountType);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);

  const query = searchParams.toString();
  const endpoint = `/api/mobile/transactions${query ? `?${query}` : ""}`;
  
  const data = await request<{ success: boolean } & TransactionListResponse>(endpoint);
  return {
    transactions: data.transactions,
    pagination: data.pagination,
    balances: data.balances,
  };
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export async function initiateTransfer(transfer: TransferRequest): Promise<TransferResult> {
  const data = await request<TransferResult>("/api/mobile/transfers", {
    method: "POST",
    body: JSON.stringify(transfer),
  });
  return data;
}

export async function getTransfers(): Promise<BankTransaction[]> {
  const data = await request<{ success: boolean; transfers: BankTransaction[] }>("/api/mobile/transfers");
  return data.transfers || [];
}

export async function getTransferStatus(reference: string): Promise<any> {
  const data = await request<{ success: boolean; transfer: any }>(
    `/api/mobile/transfers?reference=${encodeURIComponent(reference)}`
  );
  return data.transfer;
}

// ─── Bills ───────────────────────────────────────────────────────────────────

export async function getBills(): Promise<any[]> {
  try {
    const data = await request<{ success: boolean; bills: any[] }>("/api/bills");
    return data.bills || [];
  } catch {
    return [];
  }
}

// ─── Loans ───────────────────────────────────────────────────────────────────

export async function getLoans(): Promise<any[]> {
  try {
    const data = await request<{ success: boolean; loans: any[] }>("/api/loans");
    return data.loans || [];
  } catch {
    return [];
  }
}

// ─── Receipt Generation ──────────────────────────────────────────────────────

export interface ReceiptData {
  reference: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  description: string;
  accountType: string;
  fromAccount?: string;
  toAccount?: string;
  recipientName?: string;
  recipientBank?: string;
  user: {
    name: string;
    email: string;
    accountNumber?: string;
  };
}

/**
 * Generate a professional branded receipt HTML that can be shared/printed.
 * Uses the official Aldwych European Capital branding.
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const fmtMoney = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const fmtTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isDebit = data.amount < 0 || ["transfer-out", "withdrawal", "payment", "fee"].includes(data.type);
  const statusColor = data.status === "completed" || data.status === "posted" ? "#10B981" : 
                      data.status === "pending" ? "#C9A84C" : "#EF4444";
  const amountColor = isDebit ? "#B83232" : "#10B981";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transaction Receipt - ${data.reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; background: #f8f9fa; color: #1a1a2e; }
  .receipt { max-width: 680px; margin: 0 auto; background: #fff; }
  .header { background: #0D2440; padding: 32px 40px; text-align: center; }
  .header img { height: 48px; margin-bottom: 12px; }
  .header h1 { color: #C9A84C; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; font-weight: 400; }
  .gold-bar { height: 4px; background: linear-gradient(90deg, #C9A84C, #E8D48B, #C9A84C); }
  .body { padding: 40px; }
  .doc-title { font-size: 20px; font-weight: 700; color: #0D2440; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .doc-ref { font-size: 12px; color: #6B7280; margin-bottom: 24px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; background: ${statusColor}; margin-bottom: 24px; }
  .amount-section { text-align: center; padding: 24px; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 24px; }
  .amount-label { font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .amount-value { font-size: 32px; font-weight: 700; color: ${amountColor}; }
  .amount-currency { font-size: 14px; color: #6B7280; margin-top: 4px; }
  .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .details-table tr { border-bottom: 1px solid #F3F4F6; }
  .details-table td { padding: 12px 0; font-size: 13px; vertical-align: top; }
  .details-table td:first-child { color: #6B7280; width: 160px; font-weight: 500; }
  .details-table td:last-child { color: #1a1a2e; font-weight: 400; }
  .footer { background: #F8FAFC; border-top: 1px solid #E5E7EB; padding: 24px 40px; text-align: center; }
  .footer p { font-size: 10px; color: #9CA3AF; line-height: 1.6; }
  .footer .legal { margin-top: 12px; font-size: 9px; color: #D1D5DB; }
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 72px; color: rgba(13, 36, 64, 0.03); font-weight: 700; letter-spacing: 8px; pointer-events: none; }
  @media print { body { background: #fff; } .receipt { box-shadow: none; } }
  @media (max-width: 600px) { .body { padding: 24px 20px; } .header { padding: 24px 20px; } .amount-value { font-size: 24px; } }
</style>
</head>
<body>
<div class="receipt" style="position: relative;">
  <div class="watermark">ALDWYCH</div>
  <div class="header">
    <h1>Aldwych European Capital</h1>
  </div>
  <div class="gold-bar"></div>
  <div class="body">
    <div class="doc-title">Transaction Receipt</div>
    <div class="doc-ref">Reference: ${data.reference}</div>
    <div class="status-badge">${data.status.toUpperCase()}</div>
    <div class="amount-section">
      <div class="amount-label">Transaction Amount</div>
      <div class="amount-value">${isDebit ? "−" : "+"}${fmtMoney(data.amount, data.currency)}</div>
      <div class="amount-currency">${data.currency || "USD"}</div>
    </div>
    <table class="details-table">
      <tr><td>Date</td><td>${fmtDate(data.date)}</td></tr>
      <tr><td>Time</td><td>${fmtTime(data.date)}</td></tr>
      <tr><td>Type</td><td>${data.type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td></tr>
      <tr><td>Description</td><td>${data.description}</td></tr>
      <tr><td>Account</td><td>${data.accountType.charAt(0).toUpperCase() + data.accountType.slice(1)} Account</td></tr>
      ${data.user.accountNumber ? `<tr><td>Account Number</td><td>••••${data.user.accountNumber.slice(-4)}</td></tr>` : ""}
      ${data.recipientName ? `<tr><td>Recipient</td><td>${data.recipientName}</td></tr>` : ""}
      ${data.recipientBank ? `<tr><td>Recipient Bank</td><td>${data.recipientBank}</td></tr>` : ""}
      <tr><td>Account Holder</td><td>${data.user.name}</td></tr>
    </table>
  </div>
  <div class="footer">
    <p>This receipt is issued by Aldwych European Capital and confirms the above transaction has been processed.</p>
    <p>For queries, contact support@aldwychcapital.com or call +44 (0)20 7946 0958</p>
    <p class="legal">Aldwych European Capital is authorised and regulated by the Financial Conduct Authority (FCA) and the Prudential Regulation Authority (PRA). Registered in England and Wales No. 09876543. Registered Office: 1 Aldwych, London WC2B 4BZ.</p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Generate a professional branded statement HTML.
 */
export function generateStatementHTML(params: {
  user: BankUser;
  transactions: BankTransaction[];
  accountType: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
}): string {
  const { user, transactions, accountType, startDate, endDate, openingBalance, closingBalance } = params;

  const fmtMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const totalDeposits = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const transactionRows = transactions.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td>${t.description}</td>
      <td>${t.reference}</td>
      <td style="color: ${t.amount >= 0 ? '#10B981' : '#EF4444'}; text-align: right;">
        ${t.amount >= 0 ? "+" : "−"}${fmtMoney(Math.abs(t.amount))}
      </td>
      <td style="text-align: right;">${t.status}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Statement - ${accountType}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; background: #f8f9fa; color: #1a1a2e; font-size: 12px; }
  .statement { max-width: 800px; margin: 0 auto; background: #fff; }
  .header { background: #0D2440; padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
  .header-left h1 { color: #C9A84C; font-size: 18px; letter-spacing: 2px; font-weight: 400; }
  .header-left p { color: #94A3B8; font-size: 11px; margin-top: 4px; }
  .header-right { color: #fff; text-align: right; font-size: 11px; line-height: 1.6; }
  .gold-bar { height: 3px; background: linear-gradient(90deg, #C9A84C, #E8D48B, #C9A84C); }
  .body { padding: 32px 40px; }
  .statement-title { font-size: 16px; font-weight: 700; color: #0D2440; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .info-box { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 6px; padding: 16px; }
  .info-box h3 { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .info-box p { font-size: 12px; color: #1a1a2e; line-height: 1.6; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-item { text-align: center; padding: 12px; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 6px; }
  .summary-item .label { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-item .value { font-size: 16px; font-weight: 700; color: #0D2440; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead { background: #0D2440; }
  thead th { color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
  tbody tr { border-bottom: 1px solid #F3F4F6; }
  tbody tr:hover { background: #F8FAFC; }
  tbody td { padding: 10px 12px; font-size: 11px; }
  .footer { background: #F8FAFC; border-top: 1px solid #E5E7EB; padding: 20px 40px; text-align: center; }
  .footer p { font-size: 9px; color: #9CA3AF; line-height: 1.6; }
  @media print { body { background: #fff; } .statement { box-shadow: none; } }
  @media (max-width: 600px) { .body { padding: 20px; } .info-grid { grid-template-columns: 1fr; } .summary-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="statement">
  <div class="header">
    <div class="header-left">
      <h1>ALDWYCH EUROPEAN CAPITAL</h1>
      <p>Account Statement</p>
    </div>
    <div class="header-right">
      <p>1 Aldwych, London WC2B 4BZ<br>+44 (0)20 7946 0958<br>www.aldwychcapital.com</p>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="body">
    <div class="statement-title">${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account Statement</div>
    <div class="info-grid">
      <div class="info-box">
        <h3>Account Holder</h3>
        <p><strong>${user.name}</strong><br>${user.email}<br>${user.accountNumber ? `Account: ••••${user.accountNumber.slice(-4)}` : ""}</p>
      </div>
      <div class="info-box">
        <h3>Statement Period</h3>
        <p><strong>${fmtDate(startDate)} — ${fmtDate(endDate)}</strong><br>Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Opening Balance</div>
        <div class="value">${fmtMoney(openingBalance)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Deposits</div>
        <div class="value" style="color: #10B981;">+${fmtMoney(totalDeposits)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Withdrawals</div>
        <div class="value" style="color: #EF4444;">−${fmtMoney(totalWithdrawals)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Closing Balance</div>
        <div class="value">${fmtMoney(closingBalance)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Date</th><th>Description</th><th>Reference</th><th style="text-align: right;">Amount</th><th style="text-align: right;">Status</th></tr>
      </thead>
      <tbody>
        ${transactionRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9CA3AF;">No transactions in this period</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>This statement is issued by Aldwych European Capital. Please review all entries and report any discrepancies within 30 days.</p>
    <p style="margin-top: 8px;">Aldwych European Capital is authorised and regulated by the Financial Conduct Authority (FCA) and the Prudential Regulation Authority (PRA).<br>Registered in England and Wales No. 09876543. Registered Office: 1 Aldwych, London WC2B 4BZ.</p>
  </div>
</div>
</body>
</html>`;
}
