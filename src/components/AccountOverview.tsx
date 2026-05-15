"use client";

import React from "react";
import styles from "./AccountOverview.module.css";

const AccountOverview = () => {
  return (
    <section className={styles.overviewContainer}>
      {/* Balance Summary Row */}
      <div className={styles.balanceRow}>
        <div className={styles.totalBalanceCard}>
          <p className={styles.label}>Total Available Balance</p>
          <h2 className={styles.amount}>$48,320.00</h2>
          <p className={styles.subText}>Previous day: $47,890.00</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.actionButton}>Deposit</button>
          <button className={styles.actionButton}>Transfer</button>
          <button className={styles.actionButton}>Pay Bills</button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className={styles.accountGrid}>
        <div className={styles.accountCard}>
          <div className={styles.cardHeader}>
            <h3>Checking Account</h3>
            <span className={styles.accountNumber}>•••• 1234</span>
          </div>
          <p className={styles.accountBalance}>$18,200.00</p>
        </div>

        <div className={styles.accountCard}>
          <div className={styles.cardHeader}>
            <h3>Savings Account</h3>
            <span className={styles.accountNumber}>•••• 5678</span>
          </div>
          <p className={styles.accountBalance}>$30,120.00</p>
        </div>
      </div>
    </section>
  );
};

export default AccountOverview;
