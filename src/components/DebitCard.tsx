// File: src/components/DebitCard.tsx
import React from 'react'
import styles from './DebitCard.module.css'

interface DebitCardProps {
  accountName: string
  holderName: string
  /** Masked card number, e.g. "•••• •••• •••• 1234" */
  cardNumber: string
  /** Expiry in MM/YY format */
  expiry: string
}

export const DebitCard: React.FC<DebitCardProps> = ({
  accountName,
  holderName,
  cardNumber,
  expiry,
}) => (
  <div className={styles.card}>
    <div className={styles.logo}>Horizon</div>
    <div className={styles.chip} />
    <div className={styles.number}>{cardNumber}</div>
    <div className={styles.infoRow}>
      <span className={styles.accountName}>{accountName}</span>
      <span className={styles.expiry}>{expiry}</span>
    </div>
    <div className={styles.holderName}>{holderName}</div>
  </div>
)
