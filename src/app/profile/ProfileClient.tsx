// src/app/profile/ProfileClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./profile.module.css";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  checkingBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  accountNumber: string;
  routingNumber: string;
  createdAt: string;
}

const formatMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function ProfileClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/user/profile");

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.user);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router, fetchProfile]);

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loading}>Loading your profile…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.content}>
            <div className={styles.error}>
              <span>Error: {error}</span>
              <button className={styles.retryBtn} onClick={fetchProfile}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const totalBalance =
    profile.checkingBalance + profile.savingsBalance + profile.investmentBalance;

  return (
    <div className={styles.wrapper}>
      <Sidebar />

      <div className={styles.main}>
        <Header />

        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <h1>My Profile</h1>
            <p>Your personal details and account overview</p>
          </div>

          {/* Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <h2>{profile.name}</h2>
                <p>{profile.email}</p>
                <span
                  className={`${styles.verifiedBadge} ${
                    profile.verified ? styles.verified : styles.unverified
                  }`}
                >
                  {profile.verified ? "✓ Verified" : "Unverified"}
                </span>
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Account Number</span>
                <span className={styles.detailValue}>
                  {profile.accountNumber}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Routing Number</span>
                <span className={styles.detailValue}>
                  {profile.routingNumber}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Account Type</span>
                <span className={styles.detailValue}>Personal Banking</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Account Status</span>
                <span className={styles.detailValue} style={{ color: "#047857" }}>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Total Balance Card */}
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Total Net Worth</div>
            <div className={styles.totalAmount}>{formatMoney(totalBalance)}</div>
          </div>

          {/* Balance Cards */}
          <div className={styles.balanceCards}>
            <div className={styles.balanceCard}>
              <div className={`${styles.balanceIcon} ${styles.checking}`}>💳</div>
              <div className={styles.balanceContent}>
                <div className={styles.balanceLabel}>Checking</div>
                <div className={styles.balanceAmount}>
                  {formatMoney(profile.checkingBalance)}
                </div>
              </div>
            </div>

            <div className={styles.balanceCard}>
              <div className={`${styles.balanceIcon} ${styles.savings}`}>🏦</div>
              <div className={styles.balanceContent}>
                <div className={styles.balanceLabel}>Savings</div>
                <div className={styles.balanceAmount}>
                  {formatMoney(profile.savingsBalance)}
                </div>
              </div>
            </div>

            <div className={styles.balanceCard}>
              <div className={`${styles.balanceIcon} ${styles.investment}`}>📈</div>
              <div className={styles.balanceContent}>
                <div className={styles.balanceLabel}>Investment</div>
                <div className={styles.balanceAmount}>
                  {formatMoney(profile.investmentBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              className={`${styles.actionBtn} ${styles.primary}`}
              onClick={() => router.push("/settings")}
            >
              Edit Profile
            </button>
            <button
              className={`${styles.actionBtn} ${styles.secondary}`}
              onClick={() => router.push("/security")}
            >
              Security Settings
            </button>
            <button
              className={`${styles.actionBtn} ${styles.secondary}`}
              onClick={() => router.push("/accounts/statements")}
            >
              Download Statements
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
