// src/components/Header.tsx
"use client";
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";

// Icons
const Icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
    </svg>
  )
};

export default function Header() {
  const { format: fmtMoney } = useDisplayCurrency();
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userData, setUserData] = useState({
    name: "User",
    email: "",
    cashBalance: 0,
    investmentBalance: 0
  });
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user/dashboard');
          if (response.ok) {
            const data = await response.json();
            
            const cashBalance = (data.balances?.checking || 0) + 
                               (data.balances?.savings || 0);
            const investmentBalance = data.balances?.investment || 0;
            
            setUserData({
              name: data.user?.name || session.user.name || "User",
              email: session.user.email,
              cashBalance: cashBalance,
              investmentBalance: investmentBalance
            });
            
            const pendingTx = data.recent?.filter((t: any) => 
              t.rawStatus === "pending" || t.status === "Pending"
            ) || [];
            
            const newNotifications = [];
            if (pendingTx.length > 0) {
              newNotifications.push({
                id: 1,
                title: `${pendingTx.length} pending transaction${pendingTx.length > 1 ? 's' : ''}`,
                time: "Now",
                icon: Icons.clock,
                type: "pending"
              });
            }
            
            newNotifications.push(
              { id: 2, title: "Account secured with 2FA", time: "Active", icon: Icons.shield, type: "security" },
              { id: 3, title: "Monthly statement available", time: "View", icon: Icons.file, type: "info" }
            );
            
            setNotifications(newNotifications);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({
            name: session?.user?.name || "User",
            email: session?.user?.email || "",
            cashBalance: 0,
            investmentBalance: 0
          });
        }
      }
    };
    
    fetchUserData();
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  const formatCurrency = (amount: number) => fmtMoney(amount, { compact: true });

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Search Bar */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchContainer}>
            <span className={styles.searchIcon}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search transactions, accounts, recipients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <kbd className={styles.searchShortcut}>⌘K</kbd>
          </div>
        </form>

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Balance Display */}
          <div className={styles.balanceDisplay}>
            <span className={styles.balanceLabel}>Cash Balance</span>
            <span className={styles.balanceValue}>
              {formatCurrency(userData.cashBalance)}
            </span>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button 
              className={styles.actionButton} 
              title="Quick Transfer"
              onClick={() => router.push('/transfers/internal')}
            >
              {Icons.transfer}
            </button>
            <button 
              className={styles.actionButton} 
              title="Support"
              onClick={() => router.push('/support')}
            >
              {Icons.support}
            </button>
          </div>

          {/* Notifications */}
          <div className={styles.notificationWrapper}>
            <button 
              className={styles.notificationButton}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              {Icons.bell}
              {notifications.length > 0 && (
                <span className={styles.notificationBadge}>
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={styles.notificationDropdown}>
                <div className={styles.dropdownHeader}>
                  <h3>Notifications</h3>
                  <button className={styles.markAllRead}>Clear all</button>
                </div>
                <div className={styles.notificationList}>
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`${styles.notificationItem} ${styles[`notif${notif.type}`]}`}
                    >
                      <span className={styles.notifIcon}>{notif.icon}</span>
                      <div className={styles.notifContent}>
                        <p className={styles.notifTitle}>{notif.title}</p>
                        <span className={styles.notifTime}>{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.dropdownFooter}>
                  <a href="/notifications">View all notifications</a>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className={styles.profileWrapper}>
            <button 
              className={styles.profileButton}
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className={styles.profileAvatar}>
                {userData.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>
                  {userData.name}
                </span>
                <span className={styles.profileRole}>
                  {session?.user?.role === 'admin' ? 'Administrator' : 'Member'}
                </span>
              </div>
              <span className={`${styles.profileArrow} ${showProfile ? styles.profileArrowOpen : ''}`}>
                {Icons.chevronDown}
              </span>
            </button>

            {showProfile && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileLarge}>
                    {userData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.profileDetails}>
                    <p className={styles.profileFullName}>
                      {userData.name}
                    </p>
                    <p className={styles.profileEmail}>
                      {userData.email || session?.user?.email || ""}
                    </p>
                    {(userData.cashBalance > 0 || userData.investmentBalance > 0) && (
                      <div className={styles.profileBalance}>
                        <div className={styles.profileBalanceRow}>
                          <span className={styles.profileBalanceLabel}>Cash</span>
                          <span className={styles.profileBalanceValue}>
                            {formatCurrency(userData.cashBalance)}
                          </span>
                        </div>
                        {userData.investmentBalance > 0 && (
                          <div className={styles.profileBalanceRow}>
                            <span className={styles.profileBalanceLabel}>Investments</span>
                            <span className={styles.profileBalanceValue}>
                              {formatCurrency(userData.investmentBalance)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.profileMenu}>
                  <a href="/profile" className={styles.profileMenuItem}>
                    <span className={styles.menuIcon}>{Icons.user}</span>
                    My Profile
                  </a>
                  <a href="/settings" className={styles.profileMenuItem}>
                    <span className={styles.menuIcon}>{Icons.settings}</span>
                    Settings
                  </a>
                  <a href="/security" className={styles.profileMenuItem}>
                    <span className={styles.menuIcon}>{Icons.shield}</span>
                    Security
                  </a>
                  <a href="/help" className={styles.profileMenuItem}>
                    <span className={styles.menuIcon}>{Icons.help}</span>
                    Help & Support
                  </a>
                </div>
                
                <div className={styles.profileFooter}>
                  <button onClick={handleSignOut} className={styles.signOutButton}>
                    <span className={styles.menuIcon}>{Icons.logout}</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={styles.statusItem}>
            <span className={styles.statusDot}></span>
            <span>All Systems Operational</span>
          </div>
        </div>
        <div className={styles.statusRight}>
          <div className={styles.secureIndicator}>
            <span className={styles.lockIcon}>{Icons.lock}</span>
            <span>Secure</span>
          </div>
          <div className={styles.timeSeparator}>|</div>
          <div className={styles.timeDisplay}>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric'
            })}
            <span className={styles.timeDivider}>•</span>
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    </header>
  );
}