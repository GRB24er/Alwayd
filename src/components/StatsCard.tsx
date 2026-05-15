import React from 'react'
import styles from './StatsCard.module.css'

interface StatsCardProps {
  accountsCount: number
  totalBalance: number
}

export const StatsCard: React.FC<StatsCardProps> = ({ accountsCount, totalBalance }) => (
  <div className={styles.card}>
    <svg viewBox="0 0 32 32" className={styles.chart}>
      <circle cx="16" cy="16" r="14" className={styles.bg} />
      <circle
        cx="16"
        cy="16"
        r="14"
        className={styles.fg}
        strokeDasharray={`${(accountsCount / (accountsCount + 1)) * 100} 100`}
      />
    </svg>
    <div className={styles.info}>
      <h3>{accountsCount} Bank Accounts</h3>
      <p>Total Current Balance</p>
      <strong>${totalBalance.toFixed(2)}</strong>
    </div>
    <button className={styles.addBtn}>+ Add</button>
  </div>
)
