export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function maskAccountNumber(acc?: string): string {
  if (!acc || acc.length < 4) return "••••";
  return `••••${acc.slice(-4)}`;
}

export function statusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "completed":
    case "approved":
      return "Completed";
    case "pending":
    case "pending_verification":
      return "Pending";
    case "processing":
      return "Processing";
    case "rejected":
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

export function txTypeLabel(type: string): string {
  const map: Record<string, string> = {
    deposit: "Deposit",
    withdraw: "Withdrawal",
    "transfer-in": "Transfer In",
    "transfer-out": "Transfer Out",
    fee: "Fee",
    interest: "Interest",
    "adjustment-credit": "Credit Adjustment",
    "adjustment-debit": "Debit Adjustment",
  };
  return map[type] || type;
}

export function isDebitType(type: string): boolean {
  return ["withdraw", "transfer-out", "fee", "adjustment-debit"].includes(type);
}
