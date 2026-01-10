// src/app/transfers/scheduled/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./scheduled.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

// SVG Icons
const Icons = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}>
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}>
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

interface ScheduledTransfer {
  id: string;
  name: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  nextDate: string;
  endDate?: string;
  status: "active" | "paused" | "completed";
  executedCount: number;
  totalTransferred: number;
}

interface UserBalances {
  checking: number;
  savings: number;
  investment: number;
}

export default function ScheduledTransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manage" | "create">("manage");
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [userBalances, setUserBalances] = useState<UserBalances>({
    checking: 0,
    savings: 0,
    investment: 0
  });

  const [newTransfer, setNewTransfer] = useState({
    name: "",
    fromAccount: "checking",
    toAccount: "",
    amount: "",
    frequency: "monthly",
    startDate: "",
    endDate: "",
    memo: ""
  });

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every 2 Weeks" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" }
  ];

  useEffect(() => {
    if (session?.user?.email) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const balanceRes = await fetch('/api/user/dashboard');
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setUserBalances({
          checking: data.balances?.checking || 0,
          savings: data.balances?.savings || 0,
          investment: data.balances?.investment || 0
        });
      }

      const transfersRes = await fetch('/api/transfers/scheduled');
      if (transfersRes.ok) {
        const data = await transfersRes.json();
        setTransfers(data.transfers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return styles.statusActive;
      case "paused": return styles.statusPaused;
      case "completed": return styles.statusCompleted;
      default: return "";
    }
  };

  const calculateMonthlyTotal = () => {
    return transfers
      .filter(t => t.status === "active")
      .reduce((sum, t) => {
        if (t.frequency === "monthly") return sum + t.amount;
        if (t.frequency === "biweekly") return sum + (t.amount * 2);
        if (t.frequency === "weekly") return sum + (t.amount * 4);
        if (t.frequency === "daily") return sum + (t.amount * 30);
        if (t.frequency === "quarterly") return sum + (t.amount / 3);
        if (t.frequency === "annually") return sum + (t.amount / 12);
        return sum;
      }, 0);
  };

  const handlePauseResume = async (id: string, currentStatus: string) => {
    try {
      const response = await fetch(`/api/transfers/scheduled/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: currentStatus === 'active' ? 'paused' : 'active' 
        })
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error updating transfer:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled transfer?')) return;
    try {
      const response = await fetch(`/api/transfers/scheduled/${id}`, { method: 'DELETE' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting transfer:', error);
    }
  };

  const handleCreateTransfer = async () => {
    if (!newTransfer.name || !newTransfer.amount || !newTransfer.toAccount || !newTransfer.startDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/transfers/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTransfer,
          amount: parseFloat(newTransfer.amount)
        })
      });

      if (response.ok) {
        setNewTransfer({
          name: "",
          fromAccount: "checking",
          toAccount: "",
          amount: "",
          frequency: "monthly",
          startDate: "",
          endDate: "",
          memo: ""
        });
        setActiveTab("manage");
        fetchData();
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const getNextTransferDate = () => {
    const activeTransfers = transfers.filter(t => t.status === 'active');
    if (activeTransfers.length === 0) return 'No scheduled';
    
    const dates = activeTransfers.map(t => new Date(t.nextDate));
    const nextDate = new Date(Math.min(...dates.map(d => d.getTime())));
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (nextDate.toDateString() === today.toDateString()) return 'Today';
    if (nextDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Scheduled Transfers</h1>
            <p className={styles.pageSubtitle}>
              Automate your recurring transfers and never miss a payment
            </p>
          </div>

          <div className={styles.tabNav}>
            <button
              className={`${styles.tab} ${activeTab === "manage" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("manage")}
            >
              Manage Transfers
            </button>
            <button
              className={`${styles.tab} ${activeTab === "create" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create New
            </button>
          </div>
        </div>

        <div className={styles.container}>
          {activeTab === "manage" ? (
            <div className={styles.manageContent}>
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>{Icons.calendar}</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Active Transfers</span>
                    <span className={styles.summaryValue}>
                      {transfers.filter(t => t.status === "active").length}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>{Icons.dollar}</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Monthly Total</span>
                    <span className={styles.summaryValue}>
                      {formatCurrency(calculateMonthlyTotal())}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>{Icons.chart}</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Total Transferred</span>
                    <span className={styles.summaryValue}>
                      {formatCurrency(transfers.reduce((sum, t) => sum + t.totalTransferred, 0))}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>{Icons.refresh}</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Next Transfer</span>
                    <span className={styles.summaryValue}>{getNextTransferDate()}</span>
                  </div>
                </div>
              </div>

              <div className={styles.transfersList}>
                <h2 className={styles.sectionTitle}>Your Scheduled Transfers</h2>
                
                {transfers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>{Icons.calendar}</div>
                    <h3>No Scheduled Transfers</h3>
                    <p>You haven't set up any recurring transfers yet.</p>
                    <button 
                      className={styles.btnPrimary}
                      onClick={() => setActiveTab("create")}
                    >
                      Create Your First Transfer
                    </button>
                  </div>
                ) : (
                  transfers.map((transfer) => (
                    <motion.div
                      key={transfer.id}
                      className={styles.transferCard}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className={styles.transferHeader}>
                        <div className={styles.transferInfo}>
                          <h3 className={styles.transferName}>{transfer.name}</h3>
                          <span className={`${styles.transferStatus} ${getStatusColor(transfer.status)}`}>
                            {transfer.status}
                          </span>
                        </div>
                        <div className={styles.transferAmount}>
                          {formatCurrency(transfer.amount)}
                          <span className={styles.frequency}>/{transfer.frequency}</span>
                        </div>
                      </div>

                      <div className={styles.transferDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>From:</span>
                          <span className={styles.detailValue}>{transfer.fromAccount}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>To:</span>
                          <span className={styles.detailValue}>{transfer.toAccount}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Next Date:</span>
                          <span className={styles.detailValue}>
                            {new Date(transfer.nextDate).toLocaleDateString()}
                          </span>
                        </div>
                        {transfer.endDate && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>End Date:</span>
                            <span className={styles.detailValue}>
                              {new Date(transfer.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={styles.transferStats}>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Executed</span>
                          <span className={styles.statValue}>{transfer.executedCount} times</span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Total Transferred</span>
                          <span className={styles.statValue}>
                            {formatCurrency(transfer.totalTransferred)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.transferActions}>
                        {transfer.status === "active" ? (
                          <button 
                            className={styles.btnPause}
                            onClick={() => handlePauseResume(transfer.id, transfer.status)}
                          >
                            {Icons.pause} Pause
                          </button>
                        ) : transfer.status === "paused" ? (
                          <button 
                            className={styles.btnResume}
                            onClick={() => handlePauseResume(transfer.id, transfer.status)}
                          >
                            {Icons.play} Resume
                          </button>
                        ) : null}
                        <button className={styles.btnEdit}>{Icons.edit} Edit</button>
                        <button 
                          className={styles.btnDelete}
                          onClick={() => handleDelete(transfer.id)}
                        >
                          {Icons.trash} Delete
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className={styles.upcomingSection}>
                <h2 className={styles.sectionTitle}>Upcoming Transfers This Month</h2>
                <div className={styles.calendar}>
                  <div className={styles.calendarHeader}>
                    <button className={styles.calendarNav}>{Icons.chevronLeft}</button>
                    <span className={styles.calendarMonth}>
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className={styles.calendarNav}>{Icons.chevronRight}</button>
                  </div>
                  <div className={styles.calendarGrid}>
                    {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), day);
                      const hasTransfer = transfers.some(t => {
                        const nextDate = new Date(t.nextDate);
                        return t.status === 'active' && 
                               nextDate.getDate() === day && 
                               nextDate.getMonth() === currentDate.getMonth();
                      });
                      
                      return (
                        <div 
                          key={day} 
                          className={`${styles.calendarDay} ${hasTransfer ? styles.hasTransfer : ''}`}
                        >
                          <span className={styles.dayNumber}>{day}</span>
                          {hasTransfer && (
                            <div className={styles.dayTransfers}>
                              <div className={styles.transferDot}></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.createContent}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.createForm}
              >
                <h2 className={styles.sectionTitle}>Create Scheduled Transfer</h2>
                
                <div className={styles.formSection}>
                  <h3>Transfer Details</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>Transfer Name <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={newTransfer.name}
                        onChange={(e) => setNewTransfer({...newTransfer, name: e.target.value})}
                        placeholder="e.g., Monthly Savings"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Amount <span className={styles.required}>*</span></label>
                      <div className={styles.amountInput}>
                        <span className={styles.currencySymbol}>$</span>
                        <input
                          type="number"
                          value={newTransfer.amount}
                          onChange={(e) => setNewTransfer({...newTransfer, amount: e.target.value})}
                          placeholder="0.00"
                          step="0.01"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className={styles.formField}>
                      <label>From Account <span className={styles.required}>*</span></label>
                      <select
                        value={newTransfer.fromAccount}
                        onChange={(e) => setNewTransfer({...newTransfer, fromAccount: e.target.value})}
                      >
                        <option value="checking">Checking - {formatCurrency(userBalances.checking)}</option>
                        <option value="savings">Savings - {formatCurrency(userBalances.savings)}</option>
                        {userBalances.investment > 0 && (
                          <option value="investment">Investment - {formatCurrency(userBalances.investment)}</option>
                        )}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label>To Account <span className={styles.required}>*</span></label>
                      <select
                        value={newTransfer.toAccount}
                        onChange={(e) => setNewTransfer({...newTransfer, toAccount: e.target.value})}
                      >
                        <option value="">Select Account</option>
                        <option value="savings">Savings Account</option>
                        <option value="investment">Investment Account</option>
                        <option value="external">External Account</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3>Schedule Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>Frequency <span className={styles.required}>*</span></label>
                      <select
                        value={newTransfer.frequency}
                        onChange={(e) => setNewTransfer({...newTransfer, frequency: e.target.value})}
                      >
                        {frequencyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label>Start Date <span className={styles.required}>*</span></label>
                      <input
                        type="date"
                        value={newTransfer.startDate}
                        onChange={(e) => setNewTransfer({...newTransfer, startDate: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>End Date (Optional)</label>
                      <input
                        type="date"
                        value={newTransfer.endDate}
                        onChange={(e) => setNewTransfer({...newTransfer, endDate: e.target.value})}
                        min={newTransfer.startDate}
                      />
                      <span className={styles.fieldHelp}>Leave empty for ongoing transfers</span>
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Memo (Optional)</label>
                      <textarea
                        value={newTransfer.memo}
                        onChange={(e) => setNewTransfer({...newTransfer, memo: e.target.value})}
                        placeholder="Add a note for this transfer"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.preview}>
                  <h3>Transfer Preview</h3>
                  <div className={styles.previewContent}>
                    <div className={styles.previewItem}>
                      <span>Transfer:</span>
                      <strong>{newTransfer.name || "Unnamed Transfer"}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>Amount:</span>
                      <strong>{formatCurrency(parseFloat(newTransfer.amount) || 0)}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>Frequency:</span>
                      <strong>{frequencyOptions.find(f => f.value === newTransfer.frequency)?.label}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>First Transfer:</span>
                      <strong>
                        {newTransfer.startDate ? 
                          new Date(newTransfer.startDate).toLocaleDateString() : 
                          "Not set"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={() => setActiveTab("manage")}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleCreateTransfer}
                  >
                    Create Scheduled Transfer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}