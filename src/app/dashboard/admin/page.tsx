// src/app/dashboard/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

interface User {
  _id: string;
  name: string;
  email: string;
  checkingBalance?: number;
  savingsBalance?: number;
  investmentBalance?: number;
  verified?: boolean;
  role?: string;
}

interface Transaction {
  _id: string;
  reference: string;
  userId: any;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
  accountType: string;
  currency?: string;
}

// Helper to safely format currency
function formatCurrency(amount: number | undefined | null, currency: string = 'USD'): string {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Helper to get balance safely
function getBalance(user: User | null, type: 'checking' | 'savings' | 'investment'): number {
  if (!user) return 0;
  switch (type) {
    case 'checking': return Number(user.checkingBalance) || 0;
    case 'savings': return Number(user.savingsBalance) || 0;
    case 'investment': return Number(user.investmentBalance) || 0;
    default: return 0;
  }
}

// Helper to get total balance
function getTotalBalance(user: User | null): number {
  if (!user) return 0;
  return getBalance(user, 'checking') + getBalance(user, 'savings') + getBalance(user, 'investment');
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [activeTab, setActiveTab] = useState("users");
  
  // Transaction form for credit/debit
  const [transactionForm, setTransactionForm] = useState({
    type: "deposit",
    amount: "",
    accountType: "checking",
    description: "",
    currency: "USD",
    sendEmail: true
  });

  // Edit transaction form
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    date: "",
    status: ""
  });

  // Show message helper
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) => {
    setMessage(msg);
    setMessageType(type);
    if (duration > 0) {
      setTimeout(() => setMessage(""), duration);
    }
  };

  // Load users and transactions on mount
  useEffect(() => {
    loadUsers();
    loadTransactions();
  }, []);

  // LOAD ALL USERS
  const loadUsers = async () => {
    setLoading(true);
    showMessage("Loading users...", 'info', 0);
    
    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.users) {
        // Normalize users to ensure balance fields exist
        const normalizedUsers = data.users.map((user: any) => ({
          ...user,
          checkingBalance: Number(user.checkingBalance) || 0,
          savingsBalance: Number(user.savingsBalance) || 0,
          investmentBalance: Number(user.investmentBalance) || 0,
        }));
        setUsers(normalizedUsers);
        showMessage(`✅ Loaded ${normalizedUsers.length} users`, 'success');
      } else {
        showMessage(`⚠️ ${data.error || 'No users found'}`, 'error');
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Failed to load users:", error);
      showMessage(`❌ Error loading users: ${error.message}`, 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // LOAD ALL TRANSACTIONS
  const loadTransactions = async () => {
    try {
      const response = await fetch("/api/admin/transactions", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  // PROCESS TRANSACTION (CREDIT/DEBIT USER)
  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      showMessage("❌ Please select a user first", 'error');
      return;
    }

    const amount = parseFloat(transactionForm.amount);
    if (!amount || amount <= 0) {
      showMessage("❌ Please enter a valid amount", 'error');
      return;
    }

    setLoading(true);
    showMessage("Processing transaction...", 'info', 0);
    
    try {
      const response = await fetch("/api/admin/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser._id,
          type: transactionForm.type,
          amount: amount,
          accountType: transactionForm.accountType,
          description: transactionForm.description || `Admin ${transactionForm.type}`,
          currency: transactionForm.currency,
          status: "completed" // Always complete immediately for admin
        })
      });

      const data = await response.json();
      console.log('Transaction response:', data);

      if (response.ok && data.success) {
        showMessage(`✅ ${data.message}`, 'success');
        
        // Update selected user's balance from response
        if (data.balance && selectedUser) {
          const updatedUser = { ...selectedUser };
          if (data.balance.field === 'checkingBalance') {
            updatedUser.checkingBalance = data.balance.current;
          } else if (data.balance.field === 'savingsBalance') {
            updatedUser.savingsBalance = data.balance.current;
          } else if (data.balance.field === 'investmentBalance') {
            updatedUser.investmentBalance = data.balance.current;
          }
          setSelectedUser(updatedUser);
        }
        
        // Reset form
        setTransactionForm({
          type: "deposit",
          amount: "",
          accountType: "checking",
          description: "",
          currency: "USD",
          sendEmail: true
        });
        
        // Reload data
        await loadUsers();
        await loadTransactions();
      } else {
        showMessage(`❌ ${data.error || 'Transaction failed'}`, 'error');
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      showMessage(`❌ Failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // APPROVE TRANSACTION
  const approveTransaction = async (transactionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendNotification: true })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("✅ Transaction approved!", 'success');
        await loadTransactions();
        await loadUsers();
      } else {
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      showMessage("❌ Failed to approve transaction", 'error');
    } finally {
      setLoading(false);
    }
  };

  // DECLINE TRANSACTION
  const declineTransaction = async (transactionId: string) => {
    const reason = prompt("Please provide a reason for declining:");
    if (!reason) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, sendNotification: true })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("Transaction declined", 'info');
        await loadTransactions();
      } else {
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      showMessage("❌ Failed to decline transaction", 'error');
    } finally {
      setLoading(false);
    }
  };

  // EDIT TRANSACTION
  const startEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: new Date(transaction.date).toISOString().slice(0, 16),
      status: transaction.status
    });
    setActiveTab("edit-transaction");
  };

  // SAVE EDITED TRANSACTION
  const saveEditedTransaction = async () => {
    if (!editingTransaction) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/transactions/${editingTransaction._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          date: editForm.date,
          status: editForm.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("✅ Transaction updated!", 'success');
        setEditingTransaction(null);
        setActiveTab("transactions");
        await loadTransactions();
        await loadUsers();
      } else {
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      showMessage("❌ Failed to update transaction", 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE TRANSACTION
  const deleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This may affect the user's balance.")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        showMessage("Transaction deleted", 'info');
        await loadTransactions();
        await loadUsers();
      } else {
        const data = await response.json();
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      showMessage("❌ Failed to delete transaction", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get user's transactions
  const getUserTransactions = (userId: string) => {
    return transactions.filter(t => 
      t.userId && (t.userId._id === userId || t.userId === userId)
    );
  };

  // Determine if transaction is credit or debit
  const isCredit = (type: string) => {
    return ['deposit', 'transfer-in', 'interest', 'adjustment-credit', 'refund'].includes(type);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Admin Dashboard</h1>
          <p className={styles.subtitle}>Transaction & User Management</p>
          <div className={styles.headerActions}>
            <button onClick={loadUsers} disabled={loading} className={styles.refreshBtn}>
              {loading ? 'Loading...' : '🔄 Refresh Users'}
            </button>
            <button onClick={loadTransactions} disabled={loading} className={styles.refreshBtn}>
              🔄 Refresh Transactions
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>👥</span>
            <div>
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>💳</span>
            <div>
              <h3>Transactions</h3>
              <p>{transactions.length}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⏳</span>
            <div>
              <h3>Pending</h3>
              <p>{transactions.filter(t => t.status === 'pending').length}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>👤</span>
            <div>
              <h3>Selected</h3>
              <p>{selectedUser ? selectedUser.name : "None"}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={activeTab === "users" ? styles.activeTab : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 Users ({users.length})
          </button>
          <button 
            className={activeTab === "credit-debit" ? styles.activeTab : ""}
            onClick={() => setActiveTab("credit-debit")}
            disabled={!selectedUser}
          >
            💰 Credit/Debit
          </button>
          <button 
            className={activeTab === "transactions" ? styles.activeTab : ""}
            onClick={() => setActiveTab("transactions")}
          >
            📋 Transactions ({transactions.length})
          </button>
          {editingTransaction && (
            <button 
              className={activeTab === "edit-transaction" ? styles.activeTab : ""}
              onClick={() => setActiveTab("edit-transaction")}
            >
              ✏️ Edit Transaction
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          
          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className={styles.usersSection}>
              <h2>All Users</h2>
              <p className={styles.hint}>Click on a user to select them for credit/debit operations</p>
              
              {loading ? (
                <div className={styles.loading}>Loading users...</div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No users found in database</p>
                  <button onClick={loadUsers}>Try Again</button>
                </div>
              ) : (
                <div className={styles.usersGrid}>
                  {users.map(user => (
                    <div 
                      key={user._id}
                      className={`${styles.userCard} ${selectedUser?._id === user._id ? styles.selected : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className={styles.userHeader}>
                        <h3>{user.name || 'Unnamed User'}</h3>
                        {user.verified && <span className={styles.verifiedBadge}>✓ Verified</span>}
                      </div>
                      <p className={styles.userEmail}>{user.email}</p>
                      
                      <div className={styles.balances}>
                        <div className={styles.balanceRow}>
                          <span>Checking:</span>
                          <strong>{formatCurrency(user.checkingBalance)}</strong>
                        </div>
                        <div className={styles.balanceRow}>
                          <span>Savings:</span>
                          <strong>{formatCurrency(user.savingsBalance)}</strong>
                        </div>
                        <div className={styles.balanceRow}>
                          <span>Investment:</span>
                          <strong>{formatCurrency(user.investmentBalance)}</strong>
                        </div>
                        <div className={`${styles.balanceRow} ${styles.totalBalance}`}>
                          <span>Total:</span>
                          <strong>{formatCurrency(getTotalBalance(user))}</strong>
                        </div>
                      </div>
                      
                      {/* User's Recent Transactions */}
                      <div className={styles.userTransactions}>
                        <h4>Recent Activity</h4>
                        {getUserTransactions(user._id).length === 0 ? (
                          <p className={styles.noTransactions}>No transactions yet</p>
                        ) : (
                          getUserTransactions(user._id).slice(0, 3).map(tx => (
                            <div key={tx._id} className={styles.miniTransaction}>
                              <span className={styles.txType}>{tx.type}</span>
                              <span className={isCredit(tx.type) ? styles.credit : styles.debit}>
                                {isCredit(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                              <span className={`${styles.status} ${styles[tx.status]}`}>
                                {tx.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <button 
                        className={styles.manageBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setActiveTab("credit-debit");
                        }}
                      >
                        Manage Account →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREDIT/DEBIT TAB */}
          {activeTab === "credit-debit" && selectedUser && (
            <div className={styles.transactionSection}>
              <h2>Credit/Debit Account</h2>
              
              <div className={styles.selectedUserInfo}>
                <div className={styles.userInfoHeader}>
                  <h3>{selectedUser.name}</h3>
                  <button 
                    className={styles.changeUserBtn}
                    onClick={() => setActiveTab("users")}
                  >
                    Change User
                  </button>
                </div>
                <p>{selectedUser.email}</p>
                <div className={styles.currentBalances}>
                  <div className={styles.balanceCard}>
                    <span>Checking</span>
                    <strong>{formatCurrency(selectedUser.checkingBalance)}</strong>
                  </div>
                  <div className={styles.balanceCard}>
                    <span>Savings</span>
                    <strong>{formatCurrency(selectedUser.savingsBalance)}</strong>
                  </div>
                  <div className={styles.balanceCard}>
                    <span>Investment</span>
                    <strong>{formatCurrency(selectedUser.investmentBalance)}</strong>
                  </div>
                </div>
              </div>

              <form onSubmit={handleTransaction} className={styles.transactionForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Transaction Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    >
                      <optgroup label="Credit (Add Funds)">
                        <option value="deposit">💰 Deposit</option>
                        <option value="transfer-in">↗️ Transfer In</option>
                        <option value="interest">📈 Interest</option>
                        <option value="adjustment-credit">✅ Adjustment Credit</option>
                      </optgroup>
                      <optgroup label="Debit (Remove Funds)">
                        <option value="withdraw">💸 Withdraw</option>
                        <option value="transfer-out">↘️ Transfer Out</option>
                        <option value="fee">💳 Fee</option>
                        <option value="adjustment-debit">⚠️ Adjustment Debit</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Account</label>
                    <select
                      value={transactionForm.accountType}
                      onChange={(e) => setTransactionForm({...transactionForm, accountType: e.target.value})}
                    >
                      <option value="checking">Checking Account</option>
                      <option value="savings">Savings Account</option>
                      <option value="investment">Investment Account</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Amount</label>
                    <div className={styles.amountInput}>
                      <select
                        value={transactionForm.currency}
                        onChange={(e) => setTransactionForm({...transactionForm, currency: e.target.value})}
                        className={styles.currencySelect}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        type="number"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                        placeholder="0.00"
                        required
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <input
                      type="text"
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                      placeholder="Transaction description (optional)"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={transactionForm.sendEmail}
                      onChange={(e) => setTransactionForm({...transactionForm, sendEmail: e.target.checked})}
                    />
                    Send email notification to user
                  </label>
                </div>

                {/* Preview */}
                {transactionForm.amount && (
                  <div className={styles.preview}>
                    <h4>Transaction Preview</h4>
                    <p>
                      {isCredit(transactionForm.type) ? 'Credit' : 'Debit'} {' '}
                      <strong>{formatCurrency(parseFloat(transactionForm.amount) || 0, transactionForm.currency)}</strong>
                      {' '} to {selectedUser.name}'s {transactionForm.accountType} account
                    </p>
                    <p className={styles.newBalance}>
                      New balance: {' '}
                      <strong>
                        {formatCurrency(
                          getBalance(selectedUser, transactionForm.accountType as any) + 
                          (isCredit(transactionForm.type) ? 1 : -1) * (parseFloat(transactionForm.amount) || 0),
                          transactionForm.currency
                        )}
                      </strong>
                    </p>
                  </div>
                )}

                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? "Processing..." : `Execute ${isCredit(transactionForm.type) ? 'Credit' : 'Debit'}`}
                </button>
              </form>
            </div>
          )}

          {/* No user selected for credit/debit */}
          {activeTab === "credit-debit" && !selectedUser && (
            <div className={styles.emptyState}>
              <h3>No User Selected</h3>
              <p>Please select a user from the Users tab to credit or debit their account.</p>
              <button onClick={() => setActiveTab("users")}>Go to Users</button>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <div className={styles.transactionsSection}>
              <h2>All Transactions</h2>
              
              {transactions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.transactionTable}>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Account</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx._id}>
                          <td className={styles.reference}>{tx.reference}</td>
                          <td>{tx.userId?.name || tx.userId?.email || 'Unknown'}</td>
                          <td className={styles.txType}>{tx.type}</td>
                          <td className={isCredit(tx.type) ? styles.credit : styles.debit}>
                            {isCredit(tx.type) ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td>{tx.accountType}</td>
                          <td className={styles.description}>{tx.description}</td>
                          <td>{new Date(tx.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles[tx.status]}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              {tx.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => approveTransaction(tx._id)}
                                    className={styles.approveBtn}
                                    disabled={loading}
                                    title="Approve"
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    onClick={() => declineTransaction(tx._id)}
                                    className={styles.declineBtn}
                                    disabled={loading}
                                    title="Decline"
                                  >
                                    ✗
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => startEditTransaction(tx)}
                                className={styles.editBtn}
                                disabled={loading}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => deleteTransaction(tx._id)}
                                className={styles.deleteBtn}
                                disabled={loading}
                                title="Delete"
                              >
                                🗑️
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
          )}

          {/* EDIT TRANSACTION TAB */}
          {activeTab === "edit-transaction" && editingTransaction && (
            <div className={styles.editSection}>
              <h2>Edit Transaction</h2>
              
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Reference</label>
                  <input type="text" value={editingTransaction.reference} disabled className={styles.disabled} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Amount</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input
                    type="datetime-local"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className={styles.formActions}>
                  <button onClick={saveEditedTransaction} disabled={loading} className={styles.saveBtn}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingTransaction(null);
                      setActiveTab("transactions");
                    }}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}