// src/app/accounts/statements/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Download, Mail, Calendar, FileText, CheckCircle } from "lucide-react";
import styles from "./statements.module.css";

export default function StatementsPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const requestStatement = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch('/api/statements/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          accountType
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setStartDate("");
        setEndDate("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result.error || 'Failed to request statement');
      }
    } catch (err) {
      setError('Failed to request statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerInfo}>
              <h1>Account Statements</h1>
              <p>Request and download your account statements</p>
            </div>
          </div>

          <div className={styles.grid}>
            {/* Request Statement Card */}
            <div className={styles.requestCard}>
              <div className={styles.cardHeader}>
                <Mail size={24} />
                <h2>Request Email Statement</h2>
              </div>
              <p className={styles.cardDescription}>
                Select a date range and we'll email you a detailed PDF statement of your transactions
              </p>

              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Account Type</label>
                  <select 
                    value={accountType} 
                    onChange={(e) => setAccountType(e.target.value)}
                    className={styles.select}
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="investment">Investment Account</option>
                  </select>
                </div>

                <div className={styles.dateRange}>
                  <div className={styles.formGroup}>
                    <label>Start Date</label>
                    <div className={styles.inputIcon}>
                      <Calendar size={18} />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>End Date</label>
                    <div className={styles.inputIcon}>
                      <Calendar size={18} />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        min={startDate}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className={styles.successMessage}>
                    <CheckCircle size={20} />
                    Statement request sent! Check your email in a few minutes.
                  </div>
                )}

                <button 
                  onClick={requestStatement}
                  disabled={loading}
                  className={styles.requestButton}
                >
                  {loading ? 'Sending Request...' : 'Request Statement'}
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <FileText size={24} />
                <h3>What's Included</h3>
              </div>
              
              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>✓</div>
                  <div>
                    <strong>All Transactions</strong>
                    <p>Complete list of deposits, withdrawals, and transfers</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>✓</div>
                  <div>
                    <strong>Account Summary</strong>
                    <p>Opening and closing balances for the period</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>✓</div>
                  <div>
                    <strong>Transaction Details</strong>
                    <p>Date, amount, description, and running balance</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>✓</div>
                  <div>
                    <strong>PDF Format</strong>
                    <p>Professional, printable document sent to your email</p>
                  </div>
                </div>
              </div>

              <div className={styles.infoNote}>
                <strong>Note:</strong> Statements are typically delivered within 5 minutes. 
                If you don't receive it, check your spam folder or contact support.
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <h3>Quick Statement Requests</h3>
            <div className={styles.quickButtons}>
              <button 
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className={styles.quickBtn}
              >
                <Calendar size={18} />
                Last 30 Days
              </button>
              <button 
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(startOfMonth.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className={styles.quickBtn}
              >
                <Calendar size={18} />
                This Month
              </button>
              <button 
                onClick={() => {
                  const today = new Date();
                  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  setStartDate(lastMonthStart.toISOString().split('T')[0]);
                  setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                }}
                className={styles.quickBtn}
              >
                <Calendar size={18} />
                Last Month
              </button>
              <button 
                onClick={() => {
                  const today = new Date();
                  const startOfYear = new Date(today.getFullYear(), 0, 1);
                  setStartDate(startOfYear.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className={styles.quickBtn}
              >
                <Calendar size={18} />
                Year to Date
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}