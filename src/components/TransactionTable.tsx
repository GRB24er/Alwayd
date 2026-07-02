// components/TransactionTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import styles from "./TransactionTable.module.css";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed" | "Processing" | "Cancelled";
  date: string;
  category: string;
  type?: "credit" | "debit";
  merchantLogo?: string;
  reference?: string;
  method?: string;
  balance?: number;
}

interface TransactionTableProps {
  transactions?: Transaction[];
  showFilters?: boolean;
  showExport?: boolean;
  title?: string;
  maxHeight?: string;
}

// Icons
const Icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  export: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ban: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  creditIn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  debitOut: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  )
};

export default function TransactionTable({ 
  transactions = [], 
  showFilters = false,
  showExport = false,
  title = "Recent Transactions",
  maxHeight = "600px"
}: TransactionTableProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Transaction["status"]>("all");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Filter and sort transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterStatus !== "all") {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterType !== "all") {
      filtered = filtered.filter(t => {
        const isCredit = t.amount > 0;
        return filterType === "credit" ? isCredit : !isCredit;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "amount") {
        comparison = Math.abs(a.amount) - Math.abs(b.amount);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, filterStatus, filterType, searchQuery, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = processedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const credits = processedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const debits = processedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const pending = processedTransactions.filter(t => t.status === "Pending" || t.status === "Processing").length;
    
    return { total, credits, debits, pending };
  }, [processedTransactions]);

  const exportToCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount", "Status", "Reference"];
    const rows = processedTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.category,
      t.amount.toFixed(2),
      t.status,
      t.reference || t.id
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusIcon = (status: Transaction["status"]) => {
    switch(status) {
      case "Completed": return Icons.check;
      case "Pending": return Icons.clock;
      case "Processing": return Icons.zap;
      case "Failed": return Icons.x;
      case "Cancelled": return Icons.ban;
      default: return Icons.clock;
    }
  };

  const getCategoryIcon = (category: string, amount: number) => {
    const isCredit = amount > 0;
    const cat = category.toLowerCase();
    
    if (cat.includes("salary") || cat.includes("deposit") || cat.includes("income")) {
      return <span className={styles.catIconCredit}>{Icons.creditIn}</span>;
    }
    if (cat.includes("transfer")) {
      return isCredit ? 
        <span className={styles.catIconCredit}>{Icons.creditIn}</span> : 
        <span className={styles.catIconDebit}>{Icons.debitOut}</span>;
    }
    return isCredit ? 
      <span className={styles.catIconCredit}>{Icons.creditIn}</span> : 
      <span className={styles.catIconDebit}>{Icons.debitOut}</span>;
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.subtitle}>
            {processedTransactions.length} of {transactions.length} transactions
          </p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.viewButton} ${viewMode === "table" ? styles.active : ""}`}
              onClick={() => setViewMode("table")}
              aria-label="Table view"
            >
              {Icons.table}
            </button>
            <button 
              className={`${styles.viewButton} ${viewMode === "cards" ? styles.active : ""}`}
              onClick={() => setViewMode("cards")}
              aria-label="Card view"
            >
              {Icons.grid}
            </button>
          </div>
          
          {showExport && (
            <button className={styles.exportButton} onClick={exportToCSV}>
              {Icons.export}
              <span>Export</span>
            </button>
          )}
          
          <Link href="/transactions" className={styles.viewAllButton}>
            View All
            {Icons.arrowRight}
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.selectWrapper}>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <span className={styles.selectArrow}>{Icons.chevronDown}</span>
          </div>
          
          <div className={styles.selectWrapper}>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="credit">Credits Only</option>
              <option value="debit">Debits Only</option>
            </select>
            <span className={styles.selectArrow}>{Icons.chevronDown}</span>
          </div>
          
          <div className={styles.selectWrapper}>
            <select 
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className={styles.filterSelect}
            >
              <option value="date-desc">Latest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
            <span className={styles.selectArrow}>{Icons.chevronDown}</span>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Volume</span>
            <span className={styles.statValue}>
              ${stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.statCredit}`}>
          <div className={styles.statIcon}>{Icons.creditIn}</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Credits</span>
            <span className={styles.statValue}>
              +${stats.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.statDebit}`}>
          <div className={styles.statIcon}>{Icons.debitOut}</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Debits</span>
            <span className={styles.statValue}>
              -${stats.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <div className={styles.statIcon}>{Icons.clock}</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Pending</span>
            <span className={styles.statValue}>
              {stats.pending} transaction{stats.pending !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Display */}
      <div className={styles.tableWrapper} style={{ maxHeight }}>
        {viewMode === "table" ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCheckbox}>
                  <input type="checkbox" className={styles.checkbox} />
                </th>
                <th className={styles.thTransaction}>Transaction</th>
                <th className={styles.thAmount}>Amount</th>
                <th className={styles.thStatus}>Status</th>
                <th className={styles.thDate}>Date & Time</th>
                <th className={styles.thBalance}>Balance</th>
                <th className={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <div className={styles.emptyContent}>
                      <div className={styles.emptyIcon}>{Icons.empty}</div>
                      <p className={styles.emptyText}>No transactions found</p>
                      <p className={styles.emptySubtext}>
                        Try adjusting your filters or search query
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedTransactions.map((transaction, index) => {
                  const isCredit = transaction.amount > 0;
                  const isSelected = selectedTransaction === transaction.id;
                  
                  return (
                    <React.Fragment key={transaction.id}>
                      <tr 
                        className={`${styles.row} ${isSelected ? styles.selected : ''}`}
                        onClick={() => setSelectedTransaction(isSelected ? null : transaction.id)}
                      >
                        <td className={styles.tdCheckbox}>
                          <input 
                            type="checkbox" 
                            className={styles.checkbox}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className={styles.tdTransaction}>
                          <div className={styles.transactionCell}>
                            <div className={styles.transactionIcon}>
                              {getCategoryIcon(transaction.category, transaction.amount)}
                            </div>
                            <div className={styles.transactionDetails}>
                              <span className={styles.transactionName}>
                                {transaction.description}
                              </span>
                              <span className={styles.transactionCategory}>
                                {transaction.category} • {transaction.method || "Online"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={`${styles.tdAmount} ${isCredit ? styles.credit : styles.debit}`}>
                          <span className={styles.amountValue}>
                            {isCredit ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString('en-US', { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </td>
                        <td className={styles.tdStatus}>
                          <span className={`${styles.statusBadge} ${styles[`status${transaction.status}`]}`}>
                            <span className={styles.statusIcon}>
                              {getStatusIcon(transaction.status)}
                            </span>
                            {transaction.status}
                          </span>
                        </td>
                        <td className={styles.tdDate}>
                          <div className={styles.dateCell}>
                            <span className={styles.date}>
                              {new Date(transaction.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className={styles.time}>
                              {new Date(transaction.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className={styles.tdBalance}>
                          <span className={styles.balanceValue}>
                            ${(transaction.balance || 0).toLocaleString('en-US', { 
                              minimumFractionDigits: 2 
                            })}
                          </span>
                        </td>
                        <td className={styles.tdActions}>
                          <button 
                            className={styles.actionButton}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {Icons.more}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      <AnimatePresence>
                        {isSelected && (
                          <tr className={styles.expandedRow}>
                            <td colSpan={7}>
                              <motion.div 
                                className={styles.expandedContent}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className={styles.expandedGrid}>
                                  <div className={styles.expandedSection}>
                                    <h4>Transaction Details</h4>
                                    <div className={styles.detailRow}>
                                      <span className={styles.detailLabel}>Reference ID</span>
                                      <span className={styles.detailValue}>
                                        {transaction.reference || transaction.id}
                                      </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                      <span className={styles.detailLabel}>Payment Method</span>
                                      <span className={styles.detailValue}>
                                        {transaction.method || "Bank Transfer"}
                                      </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                      <span className={styles.detailLabel}>Processing Time</span>
                                      <span className={styles.detailValue}>1-2 business days</span>
                                    </div>
                                  </div>
                                  
                                  <div className={styles.expandedSection}>
                                    <h4>Actions</h4>
                                    <div className={styles.expandedActions}>
                                      <button className={styles.expandedButton}>
                                        {Icons.receipt}
                                        Download Receipt
                                      </button>
                                      <button className={styles.expandedButton}>
                                        {Icons.refresh}
                                        Dispute Transaction
                                      </button>
                                      <button className={styles.expandedButton}>
                                        {Icons.mail}
                                        Email Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <div className={styles.cardsGrid}>
            {processedTransactions.map((transaction) => {
              const isCredit = transaction.amount > 0;
              
              return (
                <motion.div 
                  key={transaction.id}
                  className={styles.transactionCard}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}>
                      {getCategoryIcon(transaction.category, transaction.amount)}
                    </div>
                    <span className={`${styles.cardStatus} ${styles[`status${transaction.status}`]}`}>
                      {transaction.status}
                    </span>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <h4 className={styles.cardTitle}>{transaction.description}</h4>
                    <p className={styles.cardCategory}>{transaction.category}</p>
                    
                    <div className={`${styles.cardAmount} ${isCredit ? styles.credit : styles.debit}`}>
                      {isCredit ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 2 
                      })}
                    </div>
                    
                    <div className={styles.cardFooter}>
                      <span className={styles.cardDate}>
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <button className={styles.cardAction}>
                        Details
                        {Icons.arrowRight}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {processedTransactions.length > 10 && (
        <div className={styles.pagination}>
          <button className={styles.paginationButton}>← Previous</button>
          <div className={styles.paginationNumbers}>
            <button className={`${styles.pageNumber} ${styles.active}`}>1</button>
            <button className={styles.pageNumber}>2</button>
            <button className={styles.pageNumber}>3</button>
            <span className={styles.paginationEllipsis}>...</span>
            <button className={styles.pageNumber}>10</button>
          </div>
          <button className={styles.paginationButton}>Next →</button>
        </div>
      )}
    </motion.div>
  );
}