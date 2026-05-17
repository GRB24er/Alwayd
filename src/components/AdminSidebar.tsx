// src/components/AdminSidebar.tsx - Aldwych European Capital Enhanced
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./Sidebar.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { 
    label: "Admin Dashboard", 
    href: "/dashboard/admin", 
    icon: "📊"
  },
  { 
    label: "Credit Cards", 
    href: "/dashboard/admin/credit-cards", 
    icon: "💳"
  },
  { 
    label: "Email Statements", 
    href: "/dashboard/admin/statements", 
    icon: "📧"
  },
  { 
    label: "Support Chats", 
    href: "/dashboard/admin/chats", 
    icon: "💬"
  },
  { 
    label: "User Management", 
    href: "/dashboard/admin/users", 
    icon: "👥"
  },
  { 
    label: "Transactions", 
    href: "/dashboard/admin/transactions", 
    icon: "💸"
  },
  {
    label: "KYC Verification",
    href: "/dashboard/admin/kyc",
    icon: "✅"
  },
  {
    label: "Account Restrictions",
    href: "/dashboard/admin/restrictions",
    icon: "🔒"
  },
  { 
    label: "Reports", 
    href: "/dashboard/admin/reports", 
    icon: "📈"
  },
  { 
    label: "System Settings", 
    href: "/dashboard/admin/settings", 
    icon: "⚙️"
  },
  { 
    label: "Back to User Dashboard", 
    href: "/dashboard", 
    icon: "🔙"
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

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

      <motion.nav
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
        initial={false}
        animate={{
          width: collapsed ? 80 : 280,
          transition: { duration: 0.3, ease: "easeInOut" }
        }}
      >
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏛️</span>
            {!collapsed && (
              <div className={styles.logoText}>
                <span className={styles.bankName}>Aldwych Capital</span>
                <span className={styles.bankTagline}>Admin Panel</span>
              </div>
            )}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Admin Info Card */}
        {!collapsed && (
          <div className={styles.quickBalanceCard} style={{
            background: 'linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(168, 147, 95, 0.1) 100%)',
            borderColor: 'rgba(201, 169, 98, 0.3)'
          }}>
            <div className={styles.balanceHeader}>
              <span className={styles.balanceTitle} style={{ color: '#c9a962' }}>Administrator</span>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
            </div>
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(201, 169, 98, 0.2)',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#1a1f2e' }}>{session?.user?.name || 'Admin'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {session?.user?.email}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className={styles.navSection}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <div key={item.label} className={styles.navItemWrapper}>
                <div
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <div className={styles.navItemContent}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className={styles.navLabel}>{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className={styles.navBadge} style={{
                            background: '#c9a962',
                            color: '#1a1f2e'
                          }}>{item.badge}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Section */}
        {!collapsed && (
          <div className={styles.bottomSection}>
            <div className={styles.securityStatus} style={{ 
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.2)'
            }}>
              <span className={styles.securityIcon}>🛡️</span>
              <div className={styles.securityText}>
                <span className={styles.securityLabel} style={{ color: '#ef4444' }}>
                  Admin Mode
                </span>
                <span className={styles.securityDetail} style={{ color: '#fca5a5' }}>
                  Full Access
                </span>
              </div>
            </div>
            
            <div className={styles.lastLogin}>
              <span className={styles.lastLoginLabel} style={{ color: '#6b7280' }}>Current Time</span>
              <span className={styles.lastLoginTime} style={{ color: '#1a1f2e' }}>
                {new Date().toLocaleString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        )}
      </motion.nav>
    </>
  );
}