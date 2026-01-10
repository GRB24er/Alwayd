// src/app/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./reports.module.css";

// SVG Icons
const Icons = {
  arrowLeft: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>),
  fileText: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>),
  download: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  trendUp: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px',color:'#10b981'}}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  trendDown: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px',color:'#ef4444'}}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>),
};

interface Transaction {
  _id: string;
  type: string;
  currency: string;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  status?: string;
}

interface Metrics {
  totalDeposits: number;
  totalWithdrawals: number;
  netChange: number;
  transactionCount: number;
  averageTransaction: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(
        `/api/user/reports?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      
      // Calculate metrics from transactions if not provided by API
      if (data.transactions) {
        setTransactions(data.transactions);
        
        const deposits = data.transactions
          .filter((t: Transaction) => t.type === 'deposit' || t.type === 'credit')
          .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);
        
        const withdrawals = data.transactions
          .filter((t: Transaction) => t.type === 'withdrawal' || t.type === 'debit' || t.type === 'transfer')
          .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

        setMetrics({
          totalDeposits: data.metrics?.totalDeposits || deposits,
          totalWithdrawals: data.metrics?.totalWithdrawals || withdrawals,
          netChange: data.metrics?.netChange || (deposits - withdrawals),
          transactionCount: data.transactions.length,
          averageTransaction: data.transactions.length > 0 
            ? data.transactions.reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0) / data.transactions.length 
            : 0
        });
      } else {
        setMetrics(data.metrics || null);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === 'deposit' || type === 'credit') return styles.deposit;
    if (type === 'withdrawal' || type === 'debit') return styles.withdrawal;
    return styles.transfer;
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Date', 'Description', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.description || '-',
      t.type,
      t.amount.toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === 'loading') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.content}>
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            {Icons.arrowLeft} Back to Dashboard
          </button>

          {/* Page Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>
              {Icons.fileText} Financial Reports
            </h1>
            <p className={styles.subtitle}>
              Generate detailed reports of your account activity
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ 
              background: 'rgba(239,68,68,0.1)', 
              color: '#dc2626', 
              padding: '1rem', 
              borderRadius: '10px', 
              marginBottom: '1.5rem',
              border: '1px solid rgba(239,68,68,0.2)'
            }}>
              {error}
            </div>
          )}

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.dateGroup}>
              <label className={styles.label}>
                From Date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
            </div>

            <div className={styles.dateGroup}>
              <label className={styles.label}>
                To Date
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={!startDate || !endDate || loading}
              className={styles.generateButton}
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Metrics Cards */}
          {metrics && (
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>Total Deposits</div>
                <div className={`${styles.metricValue} ${styles.positive}`}>
                  {formatCurrency(metrics.totalDeposits)}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>Total Withdrawals</div>
                <div className={`${styles.metricValue} ${styles.negative}`}>
                  {formatCurrency(metrics.totalWithdrawals)}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>Net Change</div>
                <div className={`${styles.metricValue} ${metrics.netChange >= 0 ? styles.positive : styles.negative}`}>
                  {metrics.netChange >= 0 ? '+' : ''}{formatCurrency(metrics.netChange)}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>Transactions</div>
                <div className={styles.metricValue}>
                  {metrics.transactionCount}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          {transactions.length > 0 && (
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Transaction History</h3>
                <button className={styles.exportBtn} onClick={exportToCSV}>
                  {Icons.download} Export CSV
                </button>
              </div>
              <table className={styles.txTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.date)}</td>
                      <td>{t.description || "—"}</td>
                      <td>
                        <span className={`${styles.typeBadge} ${getTypeBadgeClass(t.type)}`}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`${styles.amount} ${
                          t.type === 'deposit' || t.type === 'credit' 
                            ? styles.deposit 
                            : styles.withdrawal
                        }`}>
                          {t.type === 'deposit' || t.type === 'credit' ? '+' : '-'}
                          {t.currency === "USD" ? "$" : ""}
                          {Math.abs(t.amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && !metrics && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{Icons.fileText}</div>
              <h3>No Report Generated</h3>
              <p>Select a date range and click "Generate Report" to view your financial summary.</p>
            </div>
          )}

          {/* Empty Transactions */}
          {metrics && transactions.length === 0 && (
            <div className={styles.tableContainer}>
              <div className={styles.emptyState}>
                <h3>No Transactions Found</h3>
                <p>No transactions were found for the selected date range.</p>
              </div>
            </div>
          )}
        </div>
        
        <Footer />
      </div>
    </div>
  );
}