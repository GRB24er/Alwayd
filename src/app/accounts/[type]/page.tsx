// src/app/accounts/[type]/page.tsx
"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransactionTable, { Transaction } from "@/components/TransactionTable";
import styles from "./account.module.css";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface AccountData {
  balance: number;
  available: number;
  transactions: any[];
  accountNumber?: string;
}

const accountConfig: Record<string, {
  name: string;
  icon: string;
  color: string;
  gradient: string;
  features: string[];
  description: string;
}> = {
  checking: {
    name: "Premier Checking",
    icon: "💳",
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    features: ["No monthly fees", "Unlimited transactions", "Free debit card", "Mobile check deposit"],
    description: "Your everyday spending account with instant access to funds."
  },
  savings: {
    name: "High-Yield Savings",
    icon: "🏦",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    features: ["4.50% APY", "No minimum balance", "Auto-save features", "FDIC insured"],
    description: "Earn more on your savings with our competitive interest rate."
  },
  investment: {
    name: "Investment Portfolio",
    icon: "📈",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    features: ["Diversified portfolio", "Professional management", "Real-time tracking", "Tax optimization"],
    description: "Grow your wealth with our managed investment solutions."
  }
};

export default function AccountDetailPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const accountType = params?.type as string;
  
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "settings">("overview");

  const config = accountConfig[accountType] || accountConfig.checking;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // Validate account type
    if (!["checking", "savings", "investment"].includes(accountType)) {
      router.push("/dashboard");
      return;
    }

    fetchAccountData();
  }, [status, accountType, router]);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/dashboard", {
        credentials: "include"
      });
      const data = await res.json();
      
      const balanceKey = accountType as keyof typeof data.balances;
      const balance = data.balances?.[balanceKey] || 0;
      
      // Filter transactions for this account type
      const accountTransactions = (data.recent || []).filter(
        (t: any) => t.accountType === accountType
      );

      setAccountData({
        balance,
        available: accountType === "investment" ? balance * 0.85 : balance,
        transactions: accountTransactions,
        accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`
      });
    } catch (error) {
      console.error("Failed to fetch account data:", error);
      setAccountData({
        balance: 0,
        available: 0,
        transactions: [],
        accountNumber: "****0000"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data
  const generateChartData = () => {
    const data = [];
    const balance = accountData?.balance || 0;
    let value = balance * 0.75;
    
    for (let i = 0; i < 30; i++) {
      value += (Math.random() - 0.4) * (balance * 0.04);
      value = Math.max(0, value);
      data.push({
        day: i + 1,
        value: Math.round(value),
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    data[29] = { day: 30, value: balance, date: 'Today' };
    return data;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Transform transactions for table
  const transactions: Transaction[] = (accountData?.transactions || []).map((t: any) => {
    const isDebit = ['transfer-out', 'withdrawal', 'withdraw', 'payment', 'fee'].includes(t.type || '');
    return {
      id: t.reference || t._id,
      description: t.description || "Transaction",
      amount: isDebit ? -Math.abs(t.amount) : Math.abs(t.amount),
      status: t.status === "completed" || t.rawStatus === "completed" ? "Completed" : "Processing" as Transaction["status"],
      date: new Date(t.date).toISOString(),
      category: t.type || "General",
      type: isDebit ? "debit" : "credit",
      reference: t.reference,
      method: "Bank Transfer",
      balance: 0
    };
  });

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.loadingScreen}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading account details...</p>
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
        
        <main className={styles.content}>
          {/* Back Button */}
          <button className={styles.backButton} onClick={() => router.push("/dashboard")}>
            ← Back to Dashboard
          </button>

          {/* Account Header */}
          <div className={styles.accountHeader} style={{ background: config.gradient }}>
            <div className={styles.headerContent}>
              <div className={styles.accountIcon}>{config.icon}</div>
              <div className={styles.accountInfo}>
                <h1 className={styles.accountName}>{config.name}</h1>
                <p className={styles.accountNumber}>Account {accountData?.accountNumber}</p>
              </div>
            </div>
            
            <div className={styles.balanceSection}>
              <div className={styles.balanceMain}>
                <span className={styles.balanceLabel}>Current Balance</span>
                <span className={styles.balanceValue}>{formatCurrency(accountData?.balance || 0)}</span>
              </div>
              <div className={styles.balanceSecondary}>
                <div className={styles.balanceItem}>
                  <span className={styles.itemLabel}>Available</span>
                  <span className={styles.itemValue}>{formatCurrency(accountData?.available || 0)}</span>
                </div>
                {accountType === "savings" && (
                  <div className={styles.balanceItem}>
                    <span className={styles.itemLabel}>Interest Rate</span>
                    <span className={styles.itemValue}>4.50% APY</span>
                  </div>
                )}
                {accountType === "investment" && (
                  <div className={styles.balanceItem}>
                    <span className={styles.itemLabel}>YTD Return</span>
                    <span className={styles.itemValue}>+12.4%</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.headerActions}>
              <button 
                className={styles.primaryAction}
                onClick={() => router.push(`/transfers/internal?from=${accountType}`)}
              >
                Transfer Money
              </button>
              <button 
                className={styles.secondaryAction}
                onClick={() => router.push("/transactions")}
              >
                View Statements
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button 
              className={`${styles.tab} ${activeTab === "transactions" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              Transactions
            </button>
            <button 
              className={`${styles.tab} ${activeTab === "settings" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === "overview" && (
              <div className={styles.overviewGrid}>
                {/* Balance Chart */}
                <div className={styles.chartCard}>
                  <h3 className={styles.cardTitle}>Balance History (30 Days)</h3>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={generateChartData()}>
                        <defs>
                          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={config.color} stopOpacity={0.3}/>
                            <stop offset="100%" stopColor={config.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Balance']}
                          contentStyle={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke={config.color}
                          strokeWidth={2}
                          fill="url(#balanceGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Account Features */}
                <div className={styles.featuresCard}>
                  <h3 className={styles.cardTitle}>Account Features</h3>
                  <p className={styles.cardDescription}>{config.description}</p>
                  <ul className={styles.featuresList}>
                    {config.features.map((feature, idx) => (
                      <li key={idx} className={styles.featureItem}>
                        <span className={styles.featureCheck}>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick Actions */}
                <div className={styles.actionsCard}>
                  <h3 className={styles.cardTitle}>Quick Actions</h3>
                  <div className={styles.actionsList}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => router.push(`/transfers/internal?from=${accountType}`)}
                    >
                      <span className={styles.actionIcon}>↗️</span>
                      <span>Transfer Funds</span>
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => router.push("/deposit")}
                    >
                      <span className={styles.actionIcon}>💰</span>
                      <span>Deposit Money</span>
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => router.push("/accounts/statements")}
                    >
                      <span className={styles.actionIcon}>📄</span>
                      <span>Download Statement</span>
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => setActiveTab("settings")}
                    >
                      <span className={styles.actionIcon}>⚙️</span>
                      <span>Account Settings</span>
                    </button>
                  </div>
                </div>

                {/* Recent Transactions Preview */}
                <div className={styles.recentCard}>
                  <div className={styles.recentHeader}>
                    <h3 className={styles.cardTitle}>Recent Activity</h3>
                    <button 
                      className={styles.viewAllBtn}
                      onClick={() => setActiveTab("transactions")}
                    >
                      View All
                    </button>
                  </div>
                  {transactions.length > 0 ? (
                    <div className={styles.recentList}>
                      {transactions.slice(0, 5).map((txn) => (
                        <div key={txn.id} className={styles.recentItem}>
                          <div className={styles.recentInfo}>
                            <span className={styles.recentDesc}>{txn.description}</span>
                            <span className={styles.recentDate}>
                              {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <span className={`${styles.recentAmount} ${txn.amount >= 0 ? styles.credit : styles.debit}`}>
                            {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <p>No recent transactions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "transactions" && (
              <div className={styles.transactionsTab}>
                {transactions.length > 0 ? (
                  <TransactionTable 
                    transactions={transactions}
                    showFilters={true}
                    showExport={true}
                    title={`${config.name} Transactions`}
                  />
                ) : (
                  <div className={styles.emptyTransactions}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>No Transactions Yet</h3>
                    <p>Transactions for this account will appear here</p>
                    <button 
                      className={styles.emptyAction}
                      onClick={() => router.push(`/transfers/internal?from=${accountType}`)}
                    >
                      Make a Transfer
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className={styles.settingsTab}>
                <div className={styles.settingsCard}>
                  <h3 className={styles.settingsTitle}>Account Settings</h3>
                  
                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Account Nickname</span>
                      <span className={styles.settingValue}>{config.name}</span>
                    </div>
                    <button className={styles.settingAction}>Edit</button>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Paper Statements</span>
                      <span className={styles.settingValue}>Disabled (Paperless)</span>
                    </div>
                    <button className={styles.settingAction}>Change</button>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Transaction Alerts</span>
                      <span className={styles.settingValue}>Enabled</span>
                    </div>
                    <button className={styles.settingAction}>Manage</button>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Overdraft Protection</span>
                      <span className={styles.settingValue}>{accountType === "checking" ? "Linked to Savings" : "N/A"}</span>
                    </div>
                    {accountType === "checking" && (
                      <button className={styles.settingAction}>Configure</button>
                    )}
                  </div>
                </div>

                <div className={styles.dangerZone}>
                  <h3 className={styles.dangerTitle}>Danger Zone</h3>
                  <p className={styles.dangerText}>
                    Closing this account will transfer remaining funds to your primary account.
                  </p>
                  <button className={styles.dangerButton}>Close Account</button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}