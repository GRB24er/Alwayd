// src/app/bills/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./bills.module.css";

interface Bill {
  _id: string;
  payee: string;
  accountNumber: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'scheduled' | 'pending' | 'overdue';
  category: string;
  lastPaid?: string;
  autopay: boolean;
}

interface BillStats {
  totalDue: number;
  autopayCount: number;
  upcomingCount: number;
  overdueCount: number;
  totalBills: number;
}

export default function BillsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats>({
    totalDue: 0,
    autopayCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    totalBills: 0
  });
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [showAddPayee, setShowAddPayee] = useState(false);
  
  // New payee form
  const [newPayee, setNewPayee] = useState({
    payee: "",
    accountNumber: "",
    amount: "",
    dueDate: "",
    category: "Other",
    autopay: false
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBills();
    }
  }, [status]);

  const fetchBills = async () => {
    try {
      const response = await fetch("/api/bills");
      const data = await response.json();
      
      if (data.success) {
        setBills(data.bills);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      showMessage("error", "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayee = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPayee,
          amount: parseFloat(newPayee.amount)
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Payee added successfully");
        setShowAddPayee(false);
        setNewPayee({
          payee: "",
          accountNumber: "",
          amount: "",
          dueDate: "",
          category: "Other",
          autopay: false
        });
        fetchBills();
      } else {
        showMessage("error", data.error || "Failed to add payee");
      }
    } catch (error) {
      showMessage("error", "Failed to add payee");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectBill = (id: string) => {
    setSelectedBills(prev => 
      prev.includes(id) 
        ? prev.filter(billId => billId !== id)
        : [...prev, id]
    );
  };

  const handlePaySelected = async () => {
    if (selectedBills.length === 0) {
      showMessage("error", "Please select bills to pay");
      return;
    }

    const selectedTotal = bills
      .filter(bill => selectedBills.includes(bill._id))
      .reduce((sum, bill) => sum + bill.amount, 0);

    if (!confirm(`Pay ${selectedBills.length} bill(s) totaling $${selectedTotal.toFixed(2)}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billIds: selectedBills })
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", data.message);
        setSelectedBills([]);
        fetchBills();
      } else {
        showMessage("error", data.error || "Payment failed");
      }
    } catch (error) {
      showMessage("error", "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAutopay = async (billId: string, autopay: boolean) => {
    try {
      const response = await fetch("/api/bills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId, autopay })
      });

      const data = await response.json();

      if (data.success) {
        setBills(prev => prev.map(bill => 
          bill._id === billId ? { ...bill, autopay } : bill
        ));
      }
    } catch (error) {
      console.error("Failed to update autopay:", error);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this payee?")) return;

    try {
      const response = await fetch(`/api/bills?id=${billId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Payee deleted");
        fetchBills();
      } else {
        showMessage("error", data.error || "Failed to delete");
      }
    } catch (error) {
      showMessage("error", "Failed to delete payee");
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      paid: { bg: '#dcfce7', color: '#16a34a', text: 'Paid' },
      scheduled: { bg: '#fef3c7', color: '#d97706', text: 'Scheduled' },
      pending: { bg: '#dbeafe', color: '#2563eb', text: 'Due Soon' },
      overdue: { bg: '#fee2e2', color: '#dc2626', text: 'Overdue' }
    };
    const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const getNextDueDate = () => {
    const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
    if (pendingBills.length === 0) return 'None';
    
    const sorted = pendingBills.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    const nextDue = new Date(sorted[0].dueDate);
    const today = new Date();
    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      date: nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      days: diffDays
    };
  };

  const filteredBills = bills.filter(bill => {
    if (activeTab === 'upcoming') return bill.status === 'pending' || bill.status === 'overdue';
    if (activeTab === 'scheduled') return bill.status === 'scheduled';
    if (activeTab === 'history') return bill.status === 'paid';
    return true;
  });

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loading}>Loading bills...</div>
        </div>
      </div>
    );
  }

  const nextDue = getNextDueDate();

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Message */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <h1>Bill Pay Center</h1>
              <p>Manage and pay your bills securely in one place</p>
            </div>
            <div className={styles.headerRight}>
              <button 
                className={styles.addPayeeBtn}
                onClick={() => setShowAddPayee(true)}
              >
                <span>+</span> Add Payee
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon} style={{ background: '#dbeafe' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Total Due</div>
                <div className={styles.cardValue}>${stats.totalDue.toFixed(2)}</div>
                <div className={styles.cardSubtext}>This month</div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.cardIcon} style={{ background: '#dcfce7' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Auto-Pay Active</div>
                <div className={styles.cardValue}>{stats.autopayCount}</div>
                <div className={styles.cardSubtext}>Payees</div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.cardIcon} style={{ background: '#fef3c7' }}>
                <span style={{ fontSize: '1.5rem' }}>⏰</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Upcoming</div>
                <div className={styles.cardValue}>{stats.upcomingCount}</div>
                <div className={styles.cardSubtext}>Bills</div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.cardIcon} style={{ background: '#f3e8ff' }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Next Due</div>
                <div className={styles.cardValue}>
                  {typeof nextDue === 'string' ? nextDue : nextDue.date}
                </div>
                <div className={styles.cardSubtext}>
                  {typeof nextDue === 'object' ? `In ${nextDue.days} days` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button 
              className={activeTab === 'upcoming' ? styles.activeTab : ''}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Bills ({stats.upcomingCount + stats.overdueCount})
            </button>
            <button 
              className={activeTab === 'scheduled' ? styles.activeTab : ''}
              onClick={() => setActiveTab('scheduled')}
            >
              Scheduled
            </button>
            <button 
              className={activeTab === 'history' ? styles.activeTab : ''}
              onClick={() => setActiveTab('history')}
            >
              Payment History
            </button>
            <button 
              className={activeTab === 'payees' ? styles.activeTab : ''}
              onClick={() => setActiveTab('payees')}
            >
              Manage Payees
            </button>
          </div>

          {/* Bills Table */}
          <div className={styles.billsContainer}>
            {selectedBills.length > 0 && (
              <div className={styles.selectionBar}>
                <span>{selectedBills.length} bill(s) selected</span>
                <div className={styles.selectionActions}>
                  <span className={styles.selectedTotal}>
                    Total: ${bills
                      .filter(bill => selectedBills.includes(bill._id))
                      .reduce((sum, bill) => sum + bill.amount, 0)
                      .toFixed(2)}
                  </span>
                  <button 
                    className={styles.paySelectedBtn}
                    onClick={handlePaySelected}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Pay Selected'}
                  </button>
                  <button 
                    className={styles.clearBtn}
                    onClick={() => setSelectedBills([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {filteredBills.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No bills found</p>
                <button onClick={() => setShowAddPayee(true)}>Add a Payee</button>
              </div>
            ) : (
              <div className={styles.billsTable}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBills(filteredBills.filter(b => b.status !== 'paid').map(b => b._id));
                            } else {
                              setSelectedBills([]);
                            }
                          }}
                          checked={selectedBills.length === filteredBills.filter(b => b.status !== 'paid').length && selectedBills.length > 0}
                        />
                      </th>
                      <th>Payee</th>
                      <th>Account</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Auto-Pay</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => (
                      <tr key={bill._id}>
                        <td>
                          {bill.status !== 'paid' && (
                            <input 
                              type="checkbox"
                              checked={selectedBills.includes(bill._id)}
                              onChange={() => handleSelectBill(bill._id)}
                            />
                          )}
                        </td>
                        <td>
                          <div className={styles.payeeInfo}>
                            <div className={styles.payeeName}>{bill.payee}</div>
                            <div className={styles.payeeCategory}>{bill.category}</div>
                          </div>
                        </td>
                        <td className={styles.accountNumber}>{bill.accountNumber}</td>
                        <td className={styles.amount}>${bill.amount.toFixed(2)}</td>
                        <td>
                          <div className={styles.dueDate}>
                            {new Date(bill.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td>{getStatusBadge(bill.status)}</td>
                        <td>
                          <div className={styles.autopayToggle}>
                            <label className={styles.switch}>
                              <input 
                                type="checkbox" 
                                checked={bill.autopay}
                                onChange={(e) => handleToggleAutopay(bill._id, e.target.checked)}
                              />
                              <span className={styles.slider}></span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {bill.status !== 'paid' && (
                              <button 
                                className={styles.actionBtn}
                                onClick={() => {
                                  setSelectedBills([bill._id]);
                                  handlePaySelected();
                                }}
                                disabled={processing}
                              >
                                Pay Now
                              </button>
                            )}
                            <button 
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteBill(bill._id)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Payee Modal */}
      {showAddPayee && (
        <div className={styles.modalOverlay} onClick={() => setShowAddPayee(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Add New Payee</h2>
            <form onSubmit={handleAddPayee}>
              <div className={styles.formGroup}>
                <label>Payee Name</label>
                <input
                  type="text"
                  value={newPayee.payee}
                  onChange={(e) => setNewPayee(prev => ({ ...prev, payee: e.target.value }))}
                  placeholder="e.g., Electric Company"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Account Number</label>
                <input
                  type="text"
                  value={newPayee.accountNumber}
                  onChange={(e) => setNewPayee(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Your account number with this payee"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayee.amount}
                    onChange={(e) => setNewPayee(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newPayee.dueDate}
                    onChange={(e) => setNewPayee(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  value={newPayee.category}
                  onChange={(e) => setNewPayee(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Utilities">Utilities</option>
                  <option value="Internet">Internet</option>
                  <option value="Phone">Phone</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Rent">Rent/Mortgage</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newPayee.autopay}
                    onChange={(e) => setNewPayee(prev => ({ ...prev, autopay: e.target.checked }))}
                  />
                  Enable Auto-Pay
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddPayee(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={processing}>
                  {processing ? 'Adding...' : 'Add Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}