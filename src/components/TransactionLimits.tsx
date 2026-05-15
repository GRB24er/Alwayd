// src/components/TransactionLimits.tsx
"use client";

import { useState, useEffect } from 'react';
import styles from './TransactionLimits.module.css';

interface Limits {
  dailyTransferLimit: number;
  maxTransactionAmount: number;
  todayTransferred: number;
  remainingToday: number;
  checkingDailyLimit: number;
  savingsDailyLimit: number;
  limitsEnabled: boolean;
}

export default function TransactionLimits() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/limits/check');
      const result = await response.json();
      
      if (result.success) {
        setLimits(result.limits);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.limitsCard}>
        <div className={styles.loading}>Loading limits...</div>
      </div>
    );
  }

  if (!limits) return null;

  const usagePercentage = (limits.todayTransferred / limits.dailyTransferLimit) * 100;

  return (
    <div className={styles.limitsCard}>
      <div className={styles.header}>
        <h3>🔒 Daily Transfer Limits</h3>
        {limits.limitsEnabled && (
          <span className={styles.badge}>Active</span>
        )}
      </div>

      <div className={styles.mainLimit}>
        <div className={styles.limitInfo}>
          <span className={styles.label}>Daily Limit</span>
          <span className={styles.amount}>
            ${limits.dailyTransferLimit.toLocaleString()}
          </span>
        </div>
        
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${Math.min(usagePercentage, 100)}%`,
              background: usagePercentage > 90 ? '#ef4444' : 
                         usagePercentage > 70 ? '#f59e0b' : '#10b981'
            }}
          />
        </div>

        <div className={styles.usageStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Used Today</span>
            <span className={styles.statValue}>
              ${limits.todayTransferred.toLocaleString()}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Remaining</span>
            <span className={styles.statValue} style={{ color: '#10b981', fontWeight: '700' }}>
              ${limits.remainingToday.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.otherLimits}>
        <div className={styles.limitItem}>
          <div className={styles.limitIcon}>💳</div>
          <div className={styles.limitDetails}>
            <span className={styles.limitLabel}>Per Transaction Max</span>
            <span className={styles.limitValue}>
              ${limits.maxTransactionAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.limitItem}>
          <div className={styles.limitIcon}>🏦</div>
          <div className={styles.limitDetails}>
            <span className={styles.limitLabel}>Checking Daily</span>
            <span className={styles.limitValue}>
              ${limits.checkingDailyLimit.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.limitItem}>
          <div className={styles.limitIcon}>💰</div>
          <div className={styles.limitDetails}>
            <span className={styles.limitLabel}>Savings Daily</span>
            <span className={styles.limitValue}>
              ${limits.savingsDailyLimit.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <p>✨ Limits reset daily at midnight</p>
        <p>📞 Need higher limits? Contact support</p>
      </div>
    </div>
  );
}