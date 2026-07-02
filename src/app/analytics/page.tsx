"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./analytics.module.css";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("month");

  const spendingData = [
    { category: "Shopping", amount: 2450, percentage: 35 },
    { category: "Food & Dining", amount: 1820, percentage: 26 },
    { category: "Transportation", amount: 980, percentage: 14 },
    { category: "Utilities", amount: 630, percentage: 9 },
    { category: "Entertainment", amount: 560, percentage: 8 },
    { category: "Other", amount: 560, percentage: 8 }
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1>Financial Analytics</h1>
              <p>Track your spending and financial insights</p>
            </div>
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className={styles.periodSelect}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total Spending</h3>
              <div className={styles.statValue}>$7,000</div>
              <div className={styles.statChange}>-12% from last month</div>
            </div>
            <div className={styles.statCard}>
              <h3>Total Income</h3>
              <div className={styles.statValue}>$12,500</div>
              <div className={styles.statChange}>+5% from last month</div>
            </div>
            <div className={styles.statCard}>
              <h3>Savings Rate</h3>
              <div className={styles.statValue}>44%</div>
              <div className={styles.statChange}>+8% from last month</div>
            </div>
          </div>

          <div className={styles.chartSection}>
            <h3>Spending by Category</h3>
            <div className={styles.categoryList}>
              {spendingData.map((item, index) => (
                <div key={index} className={styles.categoryItem}>
                  <div className={styles.categoryInfo}>
                    <span>{item.category}</span>
                    <span>${item.amount}</span>
                  </div>
                  <div className={styles.categoryBar}>
                    <div 
                      className={styles.categoryFill}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}