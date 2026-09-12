// components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./Sidebar.module.css";
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  subItems?: { label: string; href: string }[];
  requiredRole?: string[];
}

// Professional SVG Icons
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/>
      <path d="M3 21h18"/>
      <path d="M9 7h6"/>
      <path d="M9 11h6"/>
      <path d="M9 15h4"/>
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3L21 7L17 11"/>
      <path d="M21 7H9"/>
      <path d="M7 21L3 17L7 13"/>
      <path d="M3 17H15"/>
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  cards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
      <line x1="6" y1="15" x2="10" y2="15"/>
    </svg>
  ),
  investments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  bills: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  statements: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
};

const NAV_ITEMS: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: Icons.dashboard
  },
  { 
    label: "Accounts", 
    href: "/accounts", 
    icon: Icons.accounts,
    subItems: [
      { label: "Checking", href: "/accounts/checking" },
      { label: "Savings", href: "/accounts/savings" },
      { label: "Investment", href: "/accounts/investment" }
    ]
  },
  { 
    label: "Transfers", 
    href: "/transfers", 
    icon: Icons.payments,
    subItems: [
      { label: "Internal Transfer", href: "/transfers/internal" },
      { label: "Wire Transfer", href: "/transfers/wire" },
      { label: "International", href: "/transfers/international" },
      { label: "Scheduled", href: "/transfers/scheduled" }
    ]
  },
  { 
    label: "Transactions", 
    href: "/transactions", 
    icon: Icons.activity,
    badge: 0
  },
  { 
    label: "Cards", 
    href: "/accounts/credit-cards", 
    icon: Icons.cards,
    subItems: [
      { label: "My Cards", href: "/accounts/credit-cards" },
      { label: "Apply for Card", href: "/accounts/credit-cards/apply" },
      { label: "Application Status", href: "/accounts/credit-cards/status" }
    ]
  },
  { 
    label: "Investments", 
    href: "/investments", 
    icon: Icons.investments,
    subItems: [
      { label: "Portfolio", href: "/investments/portfolio" },
      { label: "Trading", href: "/investments/trading" },
      { label: "Research", href: "/investments/research" },
      { label: "Watchlist", href: "/investments/watchlist" }
    ]
  },
  { 
    label: "Loans & Finance", 
    href: "/loans", 
    icon: Icons.portfolio,
    subItems: [
      { label: "Apply for a Loan", href: "/apply" },
      { label: "My Applications", href: "/loans" },
      { label: "Track Application", href: "/loans/track" }
    ]
  },
  {
    label: "Trusts & Estates",
    href: "/trusts",
    icon: Icons.shield,
    subItems: [
      { label: "My Trusts", href: "/trusts" },
      { label: "Establish a Trust", href: "/trusts?tab=create" }
    ]
  },
  {
    label: "Bills & Pay",
    href: "/bills",
    icon: Icons.bills,
    badge: 0
  },
  { 
    label: "Statements", 
    href: "/accounts/statements", 
    icon: Icons.statements
  },
  { 
    label: "Analytics", 
    href: "/reports", 
    icon: Icons.analytics
  },
  { 
    label: "Administration", 
    href: "/dashboard/admin", 
    icon: Icons.admin,
    requiredRole: ["admin"],
    subItems: [
      { label: "Overview", href: "/dashboard/admin" },
      { label: "Credit Cards", href: "/dashboard/admin/credit-cards" },
      { label: "Statements", href: "/dashboard/admin/statements" },
      { label: "Support", href: "/dashboard/admin/chats" },
      { label: "Users", href: "/admin/users" },
      { label: "Approvals", href: "/admin/transactions" },
      { label: "Loan Applications", href: "/dashboard/admin/loans" },
      { label: "KYC Review", href: "/admin/kyc" },
      { label: "Settings", href: "/admin/settings" }
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { format: fmtDisplay } = useDisplayCurrency();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>("User");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [pendingBills, setPendingBills] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [quickBalance, setQuickBalance] = useState({
    checking: 0,
    savings: 0,
    investment: 0
  });

  useEffect(() => {
    const fetchBalances = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user/dashboard');
          if (response.ok) {
            const data = await response.json();
            
            const checking = data.balances?.checking || 0;
            const savings = data.balances?.savings || 0;
            const investment = data.balances?.investment || 0;
            
            setQuickBalance({
              checking: checking,
              savings: savings,
              investment: investment
            });
            
            setUserName(data.user?.name || session.user.name || "User");
            setUserEmail(data.user?.email || session.user.email || "");
            setDisplayCurrency(data.user?.displayCurrency || "USD");
            
            const pending = data.recent?.filter((t: any) => 
              t.rawStatus === "pending" || t.status === "Pending"
            ).length || 0;
            setPendingTransactions(pending);
          }
        } catch (error) {
          console.error('Error fetching balances:', error);
          setUserName(session?.user?.name || "User");
          setUserEmail(session?.user?.email || "");
        }
      }
    };
    
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const navItemsWithBadges = NAV_ITEMS.map(item => {
    if (item.label === "Transactions") {
      return { ...item, badge: pendingTransactions > 0 ? pendingTransactions : undefined };
    }
    if (item.label === "Bills & Pay") {
      return { ...item, badge: pendingBills > 0 ? pendingBills : undefined };
    }
    return item;
  });

  const filteredNavItems = navItemsWithBadges.filter(item => {
    if (!item.requiredRole) return true;
    return session?.user?.role === "admin" || 
           session?.user?.email === "admin@aldwych.com" || 
           session?.user?.email === "admin@example.com";
  });

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Converts base (USD) amounts to the chosen display currency at live rates.
  const formatCurrency = (amount: number) => fmtDisplay(amount, { compact: true });

  // Cash balance = Checking + Savings only (NO investments)
  const cashBalance = quickBalance.checking + quickBalance.savings;

  return (
    <>
      {mobileOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburger}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <nav className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Header Section with Logo */}
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logoLink}>
            <div className={styles.logoContainer}>
              <Image
                src="/images/Logo.png"
                alt="Aldwych European Capital"
                width={220}
                height={60}
                className={styles.logoImage}
                priority
              />
            </div>
          </Link>
          <div className={styles.brandDivider}></div>
        </div>

        {/* Cash Balance Card */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceHeader}>
            <span className={styles.balanceLabel}>Cash Balance</span>
            <button 
              className={styles.refreshButton}
              onClick={() => window.location.reload()}
              aria-label="Refresh"
            >
              {Icons.refresh}
            </button>
          </div>
          <div className={styles.balanceAmount}>
            {formatCurrency(cashBalance)}
          </div>
          
          <div className={styles.balanceBreakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownDot} style={{background: '#c9a962'}}></span>
              <span className={styles.breakdownLabel}>Checking</span>
              <span className={styles.breakdownValue}>
                {formatCurrency(quickBalance.checking)}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownDot} style={{background: '#a8935f'}}></span>
              <span className={styles.breakdownLabel}>Savings</span>
              <span className={styles.breakdownValue}>
                {formatCurrency(quickBalance.savings)}
              </span>
            </div>
          </div>

          <button 
            className={styles.quickTransferButton}
            onClick={() => router.push('/transfers/internal')}
          >
            {Icons.transfer}
            Quick Transfer
          </button>
        </div>

        {/* Investments Card - Separate from Cash */}
        {quickBalance.investment > 0 && (
          <div className={styles.investmentCard}>
            <div className={styles.balanceHeader}>
              <span className={styles.balanceLabel}>Investments</span>
            </div>
            <div className={styles.investmentAmount}>
              {formatCurrency(quickBalance.investment)}
            </div>
            <button 
              className={styles.portfolioButton}
              onClick={() => router.push('/investments/portfolio')}
            >
              {Icons.portfolio}
              View Portfolio
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className={styles.navigation}>
          <div className={styles.navSection}>
            <div className={styles.navLabel}>MAIN MENU</div>
            {filteredNavItems.slice(0, 4).map((item) => {
              const isActive = pathname === item.href || 
                             pathname.startsWith(item.href + '/');
              const isExpanded = expandedItems.includes(item.label);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.label} className={styles.navItemWrapper}>
                  <div
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpand(item.label);
                      } else {
                        router.push(item.href);
                      }
                    }}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navText}>{item.label}</span>
                    
                    {item.badge && item.badge > 0 && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                    
                    {hasSubItems && (
                      <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                        {Icons.chevron}
                      </span>
                    )}
                  </div>

                  {hasSubItems && isExpanded && (
                    <div className={styles.subItems}>
                      {item.subItems!.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`${styles.subItem} ${
                            pathname === subItem.href ? styles.subItemActive : ''
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.navSection}>
            <div className={styles.navLabel}>BANKING</div>
            {filteredNavItems.slice(4, 10).map((item) => {
              const isActive = pathname === item.href || 
                             pathname.startsWith(item.href + '/');
              const isExpanded = expandedItems.includes(item.label);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.label} className={styles.navItemWrapper}>
                  <div
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpand(item.label);
                      } else {
                        router.push(item.href);
                      }
                    }}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navText}>{item.label}</span>
                    
                    {item.badge && item.badge > 0 && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                    
                    {hasSubItems && (
                      <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                        {Icons.chevron}
                      </span>
                    )}
                  </div>

                  {hasSubItems && isExpanded && (
                    <div className={styles.subItems}>
                      {item.subItems!.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`${styles.subItem} ${
                            pathname === subItem.href ? styles.subItemActive : ''
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Admin Section */}
          {filteredNavItems.slice(10).length > 0 && (
            <div className={styles.navSection}>
              <div className={styles.navLabel}>SYSTEM</div>
              {filteredNavItems.slice(10).map((item) => {
                const isActive = pathname === item.href || 
                               pathname.startsWith(item.href + '/');
                const isExpanded = expandedItems.includes(item.label);
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.label} className={styles.navItemWrapper}>
                    <div
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      onClick={() => {
                        if (hasSubItems) {
                          toggleExpand(item.label);
                        } else {
                          router.push(item.href);
                        }
                      }}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navText}>{item.label}</span>
                      
                      {hasSubItems && (
                        <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                          {Icons.chevron}
                        </span>
                      )}
                    </div>

                    {hasSubItems && isExpanded && (
                      <div className={styles.subItems}>
                        {item.subItems!.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`${styles.subItem} ${
                              pathname === subItem.href ? styles.subItemActive : ''
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile Section */}
        <div className={styles.userSection}>
          <div className={styles.userCard} onClick={() => router.push('/profile')}>
            <div className={styles.userAvatar}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userEmail}>{userEmail}</div>
            </div>
            <button 
              className={styles.userMenu}
              onClick={(e) => {
                e.stopPropagation();
                router.push('/settings');
              }}
              aria-label="Settings"
            >
              {Icons.settings}
            </button>
          </div>

          <div className={styles.securityBadge}>
            <span className={styles.securityIcon}>{Icons.shield}</span>
            <span>256-bit Encrypted Session</span>
          </div>
        </div>
      </nav>
    </>
  );
}