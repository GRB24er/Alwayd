'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './RecentActivity.module.css';

// Keep local types to avoid path issues
type RawStatus = 'pending' | 'completed' | 'rejected' | 'pending_verification' | 'approved' | string;
type AccountType = 'checking' | 'savings' | 'investment';

type RecentItem = {
  reference: string;
  type: string;
  currency: string;
  amount: number;
  date: string | Date;
  description?: string;
  status: string;     // display label from API (“Completed”, “Pending”, etc.)
  rawStatus?: RawStatus; // raw status (better for chips)
  accountType?: AccountType;
};

type DashboardAPI = {
  balances: {
    checking: number;
    savings: number;
    investment: number;
  };
  recent: RecentItem[];
};

const currencyFmt = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function statusToChip(raw?: RawStatus) {
  const s = (raw || '').toLowerCase();
  if (s === 'completed' || s === 'approved') {
    return { text: 'Completed', className: `${styles.statusPill} ${styles.statusCompleted}` };
  }
  if (s === 'pending_verification') {
    return { text: 'Pending – Verification', className: `${styles.statusPill} ${styles.statusPendingVerification}` };
  }
  if (s === 'rejected') {
    return { text: 'Rejected', className: `${styles.statusPill} ${styles.statusRejected}` };
  }
  return { text: 'Pending', className: `${styles.statusPill} ${styles.statusPending}` };
}

function typeIcon(type: string) {
  const t = (type || '').toLowerCase();
  const isCredit = ['deposit', 'transfer-in', 'interest', 'adjustment-credit', 'bank credit'].some(x => t.includes(x));
  const isDebit  = ['withdraw', 'transfer-out', 'fee', 'adjustment-debit'].some(x => t.includes(x));
  if (isCredit) {
    // Down-right arrow into tray (credit)
    return (
      <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
        <path d="M8 7h8m0 0v8m0-8l-8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (isDebit) {
    // Up-right arrow out of tray (debit)
    return (
      <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
        <path d="M16 17H8m0 0V9m0 8l8-8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // generic receipt
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
      <path d="M7 3h10a1 1 0 011 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 011-1zM9 7h6M9 11h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function formatDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleString();
}

function toCSV(rows: RecentItem[]) {
  const headers = ['Reference','Description','Type','Status','Amount (USD)','Date','Account'];
  const esc = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      esc(r.reference),
      esc(r.description ?? ''),
      esc(r.type),
      esc((r.rawStatus ?? r.status)?.toString()),
      esc(currencyFmt.format(r.amount)),
      esc(formatDate(r.date)),
      esc(r.accountType ?? '')
    ].join(','))
  ];
  return lines.join('\n');
}

export default function RecentActivity() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RecentItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'completed'|'pending'|'pending_verification'|'rejected'>('all');
  const [accountFilter, setAccountFilter] = useState<'all'|AccountType>('all');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/user/dashboard', { cache: 'no-store' });
      const data: DashboardAPI = await res.json();
      setRows(data?.recent ?? []);
    } catch (e) {
      console.error('Failed to load recent activity:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const raw = (r.rawStatus || r.status || '').toString().toLowerCase();
      const acct = (r.accountType || '').toString().toLowerCase();

      if (statusFilter !== 'all') {
        if (statusFilter === 'completed') {
          if (!(raw === 'completed' || raw === 'approved')) return false;
        } else if (raw !== statusFilter) {
          return false;
        }
      }
      if (accountFilter !== 'all' && acct !== accountFilter) return false;

      if (!q) return true;
      const hay = [
        r.reference,
        r.description,
        r.type,
        r.status,
        r.rawStatus,
        r.accountType
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, statusFilter, accountFilter]);

  const totals = useMemo(() => {
    let credits = 0, debits = 0, pendingCount = 0;
    for (const r of filtered) {
      const t = (r.type || '').toLowerCase();
      const isCredit = ['deposit','transfer-in','interest','adjustment-credit','bank credit'].some(x => t.includes(x));
      const isDebit  = ['withdraw','transfer-out','fee','adjustment-debit'].some(x => t.includes(x));
      if (isCredit) credits += r.amount;
      if (isDebit) debits += r.amount;
      const raw = (r.rawStatus || r.status || '').toString().toLowerCase();
      if (raw === 'pending' || raw === 'pending_verification') pendingCount++;
    }
    return { credits, debits, pendingCount };
  }, [filtered]);

  function exportCSV() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recent-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.card} aria-label="Recent transactions">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Recent Transactions</h2>
          <p className={styles.subtitle}>Live feed of your last 10 activities</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} onClick={load} aria-label="Refresh recent transactions">Refresh</button>
          <button className={styles.buttonPrimary} onClick={exportCSV} aria-label="Export to CSV">Export CSV</button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search by reference, description, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="pending_verification">Pending – Verification</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className={styles.select}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value as any)}
        >
          <option value="all">All accounts</option>
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
          <option value="investment">Investment</option>
        </select>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Credits (filtered)</div>
          <div className={styles.statValue}>{currencyFmt.format(totals.credits)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Debits (filtered)</div>
          <div className={styles.statValue}>{currencyFmt.format(totals.debits)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending count</div>
          <div className={styles.statValue}>{totals.pendingCount}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Amount (USD)</th>
              <th>Status</th>
              <th>Date</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className={styles.skeletonRow}>
                  <td><div className={styles.skelText} /></td>
                  <td><div className={styles.skelText} /></td>
                  <td><div className={styles.skelPill} /></td>
                  <td><div className={styles.skelText} /></td>
                  <td><div className={styles.skelText} /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const chip = statusToChip(r.rawStatus);
                const isDebit = ['withdraw','transfer-out','fee','adjustment-debit'].some(x =>
                  (r.type || '').toLowerCase().includes(x)
                );
                return (
                  <tr key={r.reference}>
                    <td>
                      <div className={styles.txnCell}>
                        {typeIcon(r.type)}
                        <div className={styles.txnStack}>
                          <span className={styles.txnTitle}>{r.description || '—'}</span>
                          <span className={styles.txnSub}>{r.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className={isDebit ? styles.amountDebit : styles.amountCredit}>
                      {currencyFmt.format(r.amount)}
                    </td>
                    <td>
                      <span className={chip.className}>{chip.text}</span>
                    </td>
                    <td>{formatDate(r.date)}</td>
                    <td className={styles.account}>{(r.accountType || '').toString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
