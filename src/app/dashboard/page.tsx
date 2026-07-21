// src/app/dashboard/page.tsx
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransactionTable, { Transaction } from "@/components/TransactionTable";
import AccountStatusBanner from "@/components/AccountStatusBanner";
import styles from "./dashboard.module.css";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface RawTxn {
  reference: string;
  description?: string;
  amount: number;
  date: string;
  status?: string;
  rawStatus?: string;
  accountType?: string;
  type?: string;
  currency?: string;
}

interface DashboardResponse {
  balances: {
    checking: number;
    savings: number;
    investment: number;
  };
  recent: RawTxn[];
  user?: {
    name: string;
    email?: string;
    displayCurrency?: string;
  };
  error?: string;
}

// Icons
const Icons = {
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  bills: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  deposit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  ),
  checking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  savings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/>
      <path d="M3 21h18"/>
      <path d="M12 7v4"/>
      <path d="M10 9h4"/>
    </svg>
  ),
  investment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
};

export default function DashboardPage() {
  const { format: fmtDisplay } = useDisplayCurrency();
  const { status, data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      setLoading(true);
      setError(null);
      
      fetch("/api/user/dashboard", { 
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include" 
      })
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response");
          }
          const jsonData = await res.json();
          if (!res.ok) {
            throw new Error(jsonData.error || `HTTP error! status: ${res.status}`);
          }
          return jsonData;
        })
        .then((jsonData: DashboardResponse) => {
          setData(jsonData);
          setError(null);
        })
        .catch((err) => {
          console.error("Dashboard fetch error:", err);
          setError(err.message || "Failed to load dashboard data");
          setData({
            balances: { checking: 0, savings: 0, investment: 0 },
            recent: [],
            user: {
              name: session?.user?.name || "User",
              email: session?.user?.email || ""
            }
          });
        })
        .finally(() => setLoading(false));
    }
  }, [status, router, session]);

  // Loading State
  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingLogo}>
              <div className={styles.loadingLogoIcon}>A</div>
              <div className={styles.loadingPulse}></div>
            </div>
            <div className={styles.loadingText}>Loading your dashboard</div>
            <div className={styles.loadingDots}>
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorScreen}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>⚠</div>
            <h2 className={styles.errorTitle}>Connection Error</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Data extraction
  const userName = data?.user?.name || session?.user?.name || "User";
  const firstName = userName.split(' ')[0];
  const { balances, recent } = data;
  
  const checkingBalance = balances.checking || 0;
  const savingsBalance = balances.savings || 0;
  const investmentBalance = balances.investment || 0;
  const cashBalance = checkingBalance + savingsBalance;

  // Time-based greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Processing count
  const processingCount = recent.filter(t => 
    t.rawStatus === "pending" || t.status === "Processing"
  ).length;

  // Generate chart data
  const generateChartData = (balance: number) => {
    const data = [];
    let value = balance * 0.82;
    for (let i = 0; i < 30; i++) {
      value += (Math.random() - 0.35) * (balance * 0.03);
      value = Math.max(0, value);
      data.push({ day: i + 1, value: Math.round(value) });
    }
    data[29] = { day: 30, value: balance };
    return data;
  };

  // Account configs
  const accounts = [
    {
      id: "checking",
      type: "Checking",
      name: "Premier Checking",
      accountNum: "****4521",
      balance: checkingBalance,
      available: checkingBalance,
      icon: Icons.checking,
      color: "#c9a962",
      chartData: generateChartData(checkingBalance),
      badge: null
    },
    {
      id: "savings",
      type: "Savings",
      name: "High-Yield Savings",
      accountNum: "****7832",
      balance: savingsBalance,
      available: savingsBalance,
      icon: Icons.savings,
      color: "#a8935f",
      chartData: generateChartData(savingsBalance),
      badge: "4.50% APY"
    },
    {
      id: "investment",
      type: "Investment",
      name: "Investment Portfolio",
      accountNum: "****9103",
      balance: investmentBalance,
      available: investmentBalance * 0.85,
      icon: Icons.investment,
      color: "#7c6b3e",
      chartData: generateChartData(investmentBalance),
      badge: investmentBalance > 0 ? "+12.4% YTD" : null
    }
  ];

  // Quick actions
  const quickActions = [
    { icon: Icons.transfer, title: "Transfer", desc: "Move funds", link: "/transfers/internal" },
    { icon: Icons.bills, title: "Pay Bills", desc: "Scheduled payments", link: "/bills" },
    { icon: Icons.deposit, title: "Deposit", desc: "Add funds", link: "/deposit" },
    { icon: Icons.analytics, title: "Reports", desc: "Analytics", link: "/reports" },
  ];

  // Format currency in the user's chosen display currency, converting from the
  // base ledger unit at live FX rates.
  const formatCurrency = (amount: number, compact = false) => fmtDisplay(amount, { compact });

  // Transform transactions
  const transactions: Transaction[] = recent.slice(0, 8).map((t) => {
    const isDebit = ['transfer-out', 'withdrawal', 'payment', 'fee', 'charge', 'purchase', 'withdraw'].includes(t.type || '');
    const displayAmount = isDebit ? -Math.abs(t.amount) : Math.abs(t.amount);
    
    let mappedStatus: "Completed" | "Pending" | "Failed" | "Processing" | "Cancelled" = "Processing";
    if (t.status === "Completed" || t.rawStatus === "completed" || t.rawStatus === "approved") {
      mappedStatus = "Completed";
    } else if (t.status === "Pending" || t.rawStatus === "pending") {
      mappedStatus = "Processing";
    } else if (t.status === "Rejected" || t.rawStatus === "rejected") {
      mappedStatus = "Failed";
    } else if (t.status === "Cancelled" || t.rawStatus === "cancelled") {
      mappedStatus = "Cancelled";
    }
    
    return {
      id: t.reference,
      description: t.description || "Transaction",
      amount: displayAmount,
      status: mappedStatus,
      date: new Date(t.date).toISOString(),
      category: t.accountType ? t.accountType.charAt(0).toUpperCase() + t.accountType.slice(1) : "General",
      type: isDebit ? "debit" : "credit",
      reference: t.reference,
      method: "Bank Transfer",
      balance: 0
    };
  });

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      
      <div className={styles.mainContent}>
        <Header />

        <AccountStatusBanner />

        <main className={styles.dashboard}>
          {/* Hero Section */}
          <section className={styles.hero}>
            <div className={styles.heroMain}>
              <div className={styles.heroGreeting}>
                <span className={styles.greetingText}>{getGreeting()},</span>
                <h1 className={styles.heroName}>{firstName}</h1>
              </div>
              
              <div className={styles.heroBalance}>
                <div className={styles.balanceLabel}>Cash Balance</div>
                <div className={styles.balanceValue}>{formatCurrency(cashBalance)}</div>
                {investmentBalance > 0 && (
                  <div className={styles.balanceBreakdown}>
                    <span>Investments: {formatCurrency(investmentBalance, true)}</span>
                  </div>
                )}
              </div>

              {cashBalance > 0 && (
                <div className={styles.heroStats}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>+5.2%</div>
                    <div className={styles.statLabel}>This Month</div>
                  </div>
                  <div className={styles.statDivider}></div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{accounts.filter(a => a.balance > 0).length}</div>
                    <div className={styles.statLabel}>Active Accounts</div>
                  </div>
                  <div className={styles.statDivider}></div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{recent.length}</div>
                    <div className={styles.statLabel}>Transactions</div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.heroChart}>
              {cashBalance > 0 && (
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={generateChartData(cashBalance)}>
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c9a962" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#c9a962" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#c9a962" 
                      strokeWidth={2}
                      fill="url(#heroGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.quickActions}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                className={styles.actionCard}
                onClick={() => router.push(action.link)}
              >
                <div className={styles.actionIcon}>{action.icon}</div>
                <div className={styles.actionInfo}>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionDesc}>{action.desc}</span>
                </div>
                <div className={styles.actionArrow}>{Icons.arrowRight}</div>
              </button>
            ))}
          </section>

          {/* Accounts Section */}
          <section className={styles.accountsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My Accounts</h2>
              <a href="/accounts" className={styles.sectionLink}>View All →</a>
            </div>

            <div className={styles.accountsGrid}>
              {accounts.map((account) => (
                <div 
                  key={account.id} 
                  className={styles.accountCard}
                  style={{ '--card-color': account.color } as React.CSSProperties}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}>{account.icon}</div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardName}>{account.name}</div>
                      <div className={styles.cardNumber}>{account.accountNum}</div>
                    </div>
                    {account.badge && (
                      <div className={styles.cardBadge}>{account.badge}</div>
                    )}
                  </div>

                  <div className={styles.cardBalance}>
                    <div className={styles.cardBalanceLabel}>Current Balance</div>
                    <div className={styles.cardBalanceValue}>{formatCurrency(account.balance)}</div>
                    <div className={styles.cardAvailable}>
                      Available: {formatCurrency(account.available)}
                    </div>
                  </div>

                  {account.balance > 0 && (
                    <div className={styles.cardChart}>
                      <ResponsiveContainer width="100%" height={50}>
                        <AreaChart data={account.chartData}>
                          <defs>
                            <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={account.color} stopOpacity={0.3}/>
                              <stop offset="100%" stopColor={account.color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={account.color} 
                            strokeWidth={1.5}
                            fill={`url(#grad-${account.id})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    <button 
                      className={styles.cardAction}
                      onClick={() => router.push(`/transfers/internal?from=${account.id}`)}
                    >
                      Transfer
                    </button>
                    <button 
                      className={styles.cardAction}
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section className={styles.activitySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Recent Activity</h2>
                {processingCount > 0 && (
                  <span className={styles.processingBadge}>{processingCount} Processing</span>
                )}
              </div>
              <a href="/transactions" className={styles.sectionLink}>View All →</a>
            </div>

            {transactions.length > 0 ? (
              <div className={styles.transactionsCard}>
                <TransactionTable transactions={transactions} />
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{Icons.activity}</div>
                <h3 className={styles.emptyTitle}>No Recent Activity</h3>
                <p className={styles.emptyText}>Your transactions will appear here</p>
              </div>
            )}
          </section>

          {/* Security Footer */}
          <div className={styles.securityBanner}>
            <span className={styles.securityIcon}>{Icons.shield}</span>
            <span>Protected by bank-grade 256-bit SSL encryption</span>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}