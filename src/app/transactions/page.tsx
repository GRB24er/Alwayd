// src/app/transactions/page.tsx
"use client";
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { downloadTransferReceipt } from "@/lib/receiptDownload";
import { channelLabel } from "@/lib/channels";
import styles from "./transactions.module.css";

// Types
interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  accountType: string;
  reference?: string;
  channel?: string;
  origin?: string;
  metadata?: any;
  balanceAfter?: number;
  currency: string;
  category?: string;
  counterparty?: {
    name: string;
    accountNumber?: string;
    institution?: string;
  };
}

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

interface SummaryStats {
  totalIn: number;
  totalOut: number;
  net: number;
  avgTransaction: number;
  largestTransaction: number;
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const { currency: displayCurrency } = useDisplayCurrency();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<TransactionGroup[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalIn: 0,
    totalOut: 0,
    net: 0,
    avgTransaction: 0,
    largestTransaction: 0
  });
  
  // Advanced filter states
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<20 | 50 | 100>(20);
  const [totalPages, setTotalPages] = useState(1);

  // Quick filter presets
  const quickFilters = [
    { id: 'last-7-days', label: 'Last 7 Days' },
    { id: 'last-30-days', label: 'Last 30 Days' },
    { id: 'this-month', label: 'This Month' },
    { id: 'large-transactions', label: 'Large Transactions (>$10k)' },
    { id: 'pending', label: 'Pending Transactions' },
    { id: 'international', label: 'International' }
  ];
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  // Initialize dates
 // Initialize dates - empty to show ALL transactions
useEffect(() => {
  setStartDate('');
  setEndDate('');
}, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status]);

  useEffect(() => {
    applyFilters();
  }, [
    transactions, 
    selectedAccount, 
    selectedType, 
    selectedStatus, 
    selectedCategory,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    searchTerm,
    activeQuickFilter
  ]);

  useEffect(() => {
    groupTransactionsByDate();
    calculateSummaryStats();
    updatePagination();
  }, [filteredTransactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform and validate data
        const validatedTransactions = (data.transactions || []).map((tx: any) => ({
          ...tx,
          amount: parseFloat(tx.amount) || 0,
          date: tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          accountType: tx.accountType || 'checking',
          currency: tx.currency || 'USD',
          category: tx.category || determineCategory(tx.type, tx.description)
        })).sort((a: Transaction, b: Transaction) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setTransactions(validatedTransactions);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // For demo purposes - in production, show empty state or error message
    } finally {
      setLoading(false);
    }
  };

  const determineCategory = (type: string, description: string): string => {
    const categories: { [key: string]: string[] } = {
      'transfer': ['transfer-in', 'transfer-out', 'wire', 'ach'],
      'payment': ['payment', 'bill', 'invoice', 'subscription'],
      'deposit': ['deposit', 'salary', 'dividend', 'interest', 'refund'],
      'withdrawal': ['withdrawal', 'cash', 'atm'],
      'fee': ['fee', 'charge', 'penalty'],
      'purchase': ['purchase', 'pos', 'debit', 'card'],
      'investment': ['trade', 'stock', 'bond', 'dividend', 'capital']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => 
        type.toLowerCase().includes(keyword) || 
        description.toLowerCase().includes(keyword)
      )) {
        return category;
      }
    }
    
    return 'other';
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Account filter
    if (selectedAccount !== "all") {
      filtered = filtered.filter(t => t.accountType === selectedAccount);
    }
    
    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }
    
    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    // Amount filters
    if (minAmount) {
      const min = parseFloat(minAmount);
      filtered = filtered.filter(t => Math.abs(t.amount) >= min);
    }
    
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      filtered = filtered.filter(t => Math.abs(t.amount) <= max);
    }
    
    // Date filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.date) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date) <= end);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.reference?.toLowerCase().includes(term) ||
        t.counterparty?.name.toLowerCase().includes(term) ||
        t.amount.toString().includes(term) ||
        t.category?.toLowerCase().includes(term)
      );
    }
    
    // Quick filter presets
    if (activeQuickFilter) {
      const now = new Date();
      
      switch(activeQuickFilter) {
        case 'last-7-days':
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          filtered = filtered.filter(t => new Date(t.date) >= sevenDaysAgo);
          break;
          
        case 'last-30-days':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          filtered = filtered.filter(t => new Date(t.date) >= thirtyDaysAgo);
          break;
          
        case 'this-month':
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          filtered = filtered.filter(t => new Date(t.date) >= firstOfMonth);
          break;
          
        case 'large-transactions':
          filtered = filtered.filter(t => Math.abs(t.amount) >= 10000);
          break;
          
        case 'pending':
          filtered = filtered.filter(t => t.status === 'pending');
          break;
          
        case 'international':
          filtered = filtered.filter(t => 
            t.origin === 'international_transfer' || 
            t.channel === 'international' ||
            t.counterparty?.institution?.toLowerCase().includes('international')
          );
          break;
      }
    }
    
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const applyQuickFilter = (filterId: string) => {
    if (activeQuickFilter === filterId) {
      setActiveQuickFilter('');
    } else {
      setActiveQuickFilter(filterId);
    }
  };

  const resetFilters = () => {
    setSelectedAccount("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setMinAmount("");
    setMaxAmount("");
    setSearchTerm("");
    setActiveQuickFilter("");
    
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const groupTransactionsByDate = () => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });
    
    const groupedArray = Object.keys(groups).map(date => ({
      date,
      transactions: groups[date]
    }));
    
    // Sort by date (newest first)
    groupedArray.sort((a, b) => {
      return new Date(b.transactions[0].date).getTime() - new Date(a.transactions[0].date).getTime();
    });
    
    setGroupedTransactions(groupedArray);
  };

  const calculateSummaryStats = () => {
    let totalIn = 0;
    let totalOut = 0;
    let largestTransaction = 0;
    
    filteredTransactions.forEach(t => {
      const amount = Math.abs(t.amount);
      const isCredit = ![
        'transfer-out', 
        'withdrawal', 
        'payment', 
        'fee', 
        'charge',
        'purchase'
      ].includes(t.type) && !t.type.includes('outgoing');
      
      if (isCredit) {
        totalIn += amount;
      } else {
        totalOut += amount;
      }
      
      if (amount > largestTransaction) {
        largestTransaction = amount;
      }
    });
    
    const net = totalIn - totalOut;
    const avgTransaction = filteredTransactions.length > 0 
      ? (totalIn + totalOut) / filteredTransactions.length 
      : 0;
    
    setSummaryStats({
      totalIn,
      totalOut,
      net,
      avgTransaction,
      largestTransaction
    });
  };

  const updatePagination = () => {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    setTotalPages(totalPages > 0 ? totalPages : 1);
  };

  // Transaction display functions
  const formatTransactionAmount = (transaction: Transaction): string => {
    const amount = Math.abs(transaction.amount);
    const isCredit = ![
      'transfer-out', 
      'withdrawal', 
      'payment', 
      'fee', 
      'charge',
      'purchase'
    ].includes(transaction.type) && !transaction.type.includes('outgoing');
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    return isCredit ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  const getTransactionIcon = (type: string, category?: string): string => {
    const iconMap: { [key: string]: string } = {
      'deposit': '⬇️',
      'withdrawal': '⬆️',
      'transfer-in': '📥',
      'transfer-out': '📤',
      'payment': '💳',
      'fee': '💵',
      'interest': '💰',
      'refund': '↩️',
      'purchase': '🛒',
      'charge': '📝',
      'dividend': '📈',
      'salary': '💼',
      'investment': '📊',
      'wire': '🌍',
      'ach': '🏛️'
    };
    
    return iconMap[category || type] || '📄';
  };

  const getTransactionColor = (transaction: Transaction): string => {
    const isCredit = ![
      'transfer-out', 
      'withdrawal', 
      'payment', 
      'fee', 
      'charge',
      'purchase'
    ].includes(transaction.type) && !transaction.type.includes('outgoing');
    
    return isCredit ? styles.credit : styles.debit;
  };

  // Official receipts exist for funds transfers that were accepted by the
  // bank — rejected/failed instructions never produce one.
  const hasReceipt = (transaction: Transaction): boolean => {
    return (
      ['transfer-in', 'transfer-out'].includes(transaction.type) &&
      !['rejected', 'failed'].includes(transaction.status)
    );
  };

  const handleDownloadReceipt = async (transaction: Transaction) => {
    if (downloadingReceiptId) return;
    setDownloadingReceiptId(transaction._id);
    try {
      await downloadTransferReceipt({ id: transaction._id, reference: transaction.reference });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'completed': styles.statusCompleted,
      'pending': styles.statusPending,
      'processing': styles.statusProcessing,
      'failed': styles.statusFailed,
      'reconciled': styles.statusReconciled
    };
    
    return (
      <span className={`${styles.statusBadge} ${statusMap[status] || ''}`}>
        {status}
      </span>
    );
  };

  // Pagination
  const indexOfLastTransaction = currentPage * itemsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Export functions
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = {
        format: exportFormat,
        filters: {
          account: selectedAccount,
          type: selectedType,
          status: selectedStatus,
          category: selectedCategory,
          dateRange: { startDate, endDate },
          searchTerm
        },
        transactions: filteredTransactions
      };
      
      const response = await fetch('/api/transactions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading your transaction history...</p>
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
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1>Transaction History</h1>
              <p>Monitor and analyze your financial transactions</p>
            </div>
            <button 
              className={`${styles.downloadBtn} ${exporting ? styles.loading : ''}`}
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : '📊 Export Report'}
            </button>
          </div>

          {/* Summary Cards */}
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📥</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Total Inflow</span>
                <span className={`${styles.summaryAmount} ${styles.credit}`}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: displayCurrency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(summaryStats.totalIn)}
                </span>
                <span className={`${styles.summaryTrend} ${summaryStats.totalIn > 0 ? styles.positive : ''}`}>
                  {summaryStats.totalIn > 0 ? '↑' : ''} {filteredTransactions.filter(t => ![
                    'transfer-out', 'withdrawal', 'payment', 'fee', 'charge', 'purchase'
                  ].includes(t.type)).length} transactions
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📤</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Total Outflow</span>
                <span className={`${styles.summaryAmount} ${styles.debit}`}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: displayCurrency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(summaryStats.totalOut)}
                </span>
                <span className={styles.summaryTrend}>
                  {filteredTransactions.filter(t => [
                    'transfer-out', 'withdrawal', 'payment', 'fee', 'charge', 'purchase'
                  ].includes(t.type)).length} transactions
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>💰</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Net Change</span>
                <span className={`${styles.summaryAmount} ${summaryStats.net >= 0 ? styles.credit : styles.debit}`}>
                  {summaryStats.net >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: displayCurrency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(Math.abs(summaryStats.net))}
                </span>
                <span className={`${styles.summaryTrend} ${summaryStats.net >= 0 ? styles.positive : styles.negative}`}>
                  {summaryStats.net >= 0 ? '↑' : '↓'} {Math.abs(summaryStats.net) > 0 ? ((summaryStats.net / (summaryStats.totalIn || 1)) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📊</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Avg. Transaction</span>
                <span className={styles.summaryAmount}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: displayCurrency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(summaryStats.avgTransaction)}
                </span>
                <span className={styles.summaryTrend}>
                  Largest: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: displayCurrency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(summaryStats.largestTransaction)}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className={styles.advancedFilters}>
            <div className={styles.filterSectionHeader}>
              <h2>Advanced Filters</h2>
              <button onClick={resetFilters}>Clear All Filters</button>
            </div>
            
            {/* Quick Filters */}
            <div className={styles.quickFilters}>
              {quickFilters.map(filter => (
                <button
                  key={filter.id}
                  className={`${styles.filterChip} ${activeQuickFilter === filter.id ? styles.active : ''}`}
                  onClick={() => applyQuickFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            {/* Main Filters Grid */}
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Search</label>
                <input
                  type="text"
                  placeholder="Search descriptions, references, amounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Account Type</label>
                <select 
                  value={selectedAccount} 
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Accounts</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="credit">Credit</option>
                  <option value="business">Business</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Transaction Type</label>
                <select 
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="transfer-in">Transfer In</option>
                  <option value="transfer-out">Transfer Out</option>
                  <option value="payment">Payment</option>
                  <option value="fee">Fee</option>
                  <option value="interest">Interest</option>
                  <option value="refund">Refund</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Category</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Categories</option>
                  <option value="transfer">Transfers</option>
                  <option value="payment">Payments</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="fee">Fees</option>
                  <option value="purchase">Purchases</option>
                  <option value="investment">Investments</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Status</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="reconciled">Reconciled</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Min Amount</label>
                <input
                  type="number"
                  placeholder="$0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className={styles.filterInput}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Max Amount</label>
                <input
                  type="number"
                  placeholder="$10,000+"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className={styles.filterInput}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Items Per Page</label>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value) as 20 | 50 | 100)}
                  className={styles.filterSelect}
                >
                  <option value="20">20 items</option>
                  <option value="50">50 items</option>
                  <option value="100">100 items</option>
                </select>
              </div>
            </div>
            
            {/* Date Range Picker */}
            <div className={styles.dateRangeContainer}>
              <div className={styles.dateInputGroup}>
                <label className={styles.filterLabel}>From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                  max={endDate}
                />
              </div>
              
              <div className={styles.dateInputGroup}>
                <label className={styles.filterLabel}>To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            {/* Filter Actions */}
            <div className={styles.filterActions}>
              <button 
                className={styles.resetBtn}
                onClick={resetFilters}
              >
                Reset Filters
              </button>
              <button 
                className={styles.applyBtn}
                onClick={applyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className={styles.transactionsList}>
            <div className={styles.listHeader}>
              <h3>Transaction Details</h3>
              <span className={styles.totalCount}>
                {filteredTransactions.length.toLocaleString()} transactions
              </span>
            </div>
            
            {groupedTransactions.length === 0 ? (
              <div className={styles.noTransactions}>
                <span className={styles.noTransactionsIcon}>📭</span>
                <h3>No transactions found</h3>
                <p>Try adjusting your filters or initiate a new transaction</p>
                <button 
                  className={styles.createTransactionBtn}
                  onClick={() => router.push('/transfer')}
                >
                  Create New Transaction
                </button>
              </div>
            ) : (
              <>
                {groupedTransactions.map((group) => (
                  <div key={group.date} className={styles.transactionGroup}>
                    <div className={styles.dateHeader}>
                      <span>{group.date}</span>
                      <span className={styles.dateCount}>
                        {group.transactions.length.toLocaleString()} transactions • 
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: displayCurrency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(
                          group.transactions.reduce((sum, tx) => {
                            const isCredit = !['transfer-out', 'withdrawal', 'payment', 'fee', 'charge', 'purchase'].includes(tx.type);
                            return sum + (isCredit ? tx.amount : -tx.amount);
                          }, 0)
                        )}
                      </span>
                    </div>
                    
                    {group.transactions.map((transaction) => (
                      <div 
                        key={transaction._id} 
                        className={styles.transactionItem}
                        onClick={() => {
                          // View transaction details - could be modal or separate page
                          console.log('Transaction details:', transaction);
                        }}
                      >
                        <div className={styles.transactionLeft}>
                          <span className={styles.transactionIcon}>
                            {getTransactionIcon(transaction.type, transaction.category)}
                          </span>
                          <div className={styles.transactionDetails}>
                            <div className={styles.transactionDescription}>
                              {transaction.description}
                              {transaction.counterparty?.name && (
                                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                  • {transaction.counterparty.name}
                                </span>
                              )}
                            </div>
                            <div className={styles.transactionMeta}>
                              <span className={styles.transactionType}>
                                {transaction.type.replace('-', ' ')}
                              </span>
                              {transaction.reference && (
                                <>
                                  <span className={styles.separator}>•</span>
                                  <span className={styles.transactionRef}>
                                    {transaction.reference}
                                  </span>
                                </>
                              )}
                              {transaction.accountType && (
                                <>
                                  <span className={styles.separator}>•</span>
                                  <span className={styles.transactionAccount}>
                                    {transaction.accountType}
                                  </span>
                                </>
                              )}
                              {transaction.category && transaction.category !== 'other' && (
                                <>
                                  <span className={styles.separator}>•</span>
                                  <span className={styles.transactionChannel}>
                                    {transaction.category}
                                  </span>
                                </>
                              )}
                              {transaction.channel && (
                                <>
                                  <span className={styles.separator}>•</span>
                                  <span className={styles.transactionChannel}>
                                    via {channelLabel(transaction.channel)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.transactionRight}>
                          <span className={`${styles.transactionAmount} ${getTransactionColor(transaction)}`}>
                            {formatTransactionAmount(transaction)}
                          </span>
                          {getStatusBadge(transaction.status)}
                          {transaction.balanceAfter !== undefined && (
                            <div className={styles.balanceAfter}>
                              Balance: {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: displayCurrency,
                                minimumFractionDigits: 2
                              }).format(transaction.balanceAfter)}
                            </div>
                          )}
                          {hasReceipt(transaction) && (
                            <button
                              className={styles.receiptBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadReceipt(transaction);
                              }}
                              disabled={downloadingReceiptId === transaction._id}
                              title="Download official PDF receipt"
                            >
                              {downloadingReceiptId === transaction._id ? 'Preparing…' : '🧾 Receipt'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Pagination */}
          {filteredTransactions.length > itemsPerPage && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Showing {indexOfFirstTransaction + 1} to {Math.min(indexOfLastTransaction, filteredTransactions.length)} of{' '}
                {filteredTransactions.length.toLocaleString()} transactions
              </div>
              
              <div className={styles.paginationControls}>
                <button 
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.paginationBtn}
                >
                  ← Previous
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.paginationBtn}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
        
        <Footer />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className={styles.exportModal} onClick={() => setShowExportModal(false)}>
          <div className={styles.exportModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.exportModalHeader}>
              <h3>Export Transactions</h3>
              <p>Choose your preferred format and download your transaction history</p>
            </div>
            
            <div className={styles.exportOptions}>
              <label className={styles.exportOption}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv')}
                />
                <div className={styles.exportOptionContent}>
                  <span>CSV Format</span>
                  <span>Compatible with Excel, Numbers, and other spreadsheet software</span>
                </div>
              </label>
              
              <label className={styles.exportOption}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                />
                <div className={styles.exportOptionContent}>
                  <span>PDF Report</span>
                  <span>Formatted document with transaction summaries and charts</span>
                </div>
              </label>
              
              <label className={styles.exportOption}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={(e) => setExportFormat(e.target.value as 'excel')}
                />
                <div className={styles.exportOptionContent}>
                  <span>Excel Workbook</span>
                  <span>Native Excel format with multiple sheets and formulas</span>
                </div>
              </label>
            </div>
            
            <div className={styles.exportModalActions}>
              <button 
                className={styles.exportCancelBtn}
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.exportConfirmBtn}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : `Export ${filteredTransactions.length} Transactions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}