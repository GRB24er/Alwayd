"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./portfolio.module.css";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const portfolioValue = 45458575.89;
  const initialInvestment = 9600000;
  const totalReturn = portfolioValue - initialInvestment;
  const returnPercentage = 373.53;

  const holdings = [
    { 
      symbol: "AAPL", 
      name: "Apple Inc.", 
      shares: 5000, 
      avgCost: 145.50, 
      currentPrice: 189.25, 
      value: 946250, 
      gain: 218750, 
      gainPercent: 30.09,
      dayChange: 2.34,
      dayChangePercent: 1.24
    },
    { 
      symbol: "MSFT", 
      name: "Microsoft Corporation", 
      shares: 3500, 
      avgCost: 285.25, 
      currentPrice: 378.85, 
      value: 1325975, 
      gain: 327600, 
      gainPercent: 32.82,
      dayChange: 5.67,
      dayChangePercent: 1.52
    },
    { 
      symbol: "GOOGL", 
      name: "Alphabet Inc.", 
      shares: 2000, 
      avgCost: 125.40, 
      currentPrice: 142.65, 
      value: 285300, 
      gain: 34500, 
      gainPercent: 13.74,
      dayChange: -1.23,
      dayChangePercent: -0.86
    },
    { 
      symbol: "AMZN", 
      name: "Amazon.com Inc.", 
      shares: 4000, 
      avgCost: 98.75, 
      currentPrice: 178.35, 
      value: 713400, 
      gain: 318400, 
      gainPercent: 80.61,
      dayChange: 3.45,
      dayChangePercent: 1.97
    }
  ];

  const assetAllocation = [
    { category: "Technology", value: 35, amount: 15910501.56, color: "#6366f1" },
    { category: "Finance", value: 25, amount: 11364643.97, color: "#8b5cf6" },
    { category: "Healthcare", value: 20, amount: 9091715.18, color: "#10b981" },
    { category: "Consumer", value: 15, amount: 6818786.38, color: "#f59e0b" },
    { category: "Other", value: 5, amount: 2272928.79, color: "#94a3b8" }
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <h1>Investment Portfolio</h1>
              <p>Track and manage your investment performance</p>
            </div>
            <div className={styles.headerRight}>
              <button className={styles.tradeBtn}>
                <span>📈</span> Trade Now
              </button>
              <button className={styles.reportBtn}>
                <span>📊</span> Generate Report
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>Portfolio Value</span>
                {isClient && <span className={styles.liveBadge}>LIVE</span>}
              </div>
              <div className={styles.metricValue}>
                ${(portfolioValue / 1000000).toFixed(2)}M
              </div>
              <div className={styles.metricChange}>
                <span className={styles.changePositive}>
                  ↑ ${(totalReturn / 1000000).toFixed(2)}M ({returnPercentage}%)
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>Today's Change</span>
              </div>
              <div className={styles.metricValue}>
                +$125,435
              </div>
              <div className={styles.metricChange}>
                <span className={styles.changePositive}>↑ 0.28%</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>Total Return</span>
              </div>
              <div className={styles.metricValue}>
                {returnPercentage}%
              </div>
              <div className={styles.metricChange}>
                <span className={styles.changePositive}>
                  ↑ ${(totalReturn / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>Annual Return</span>
              </div>
              <div className={styles.metricValue}>
                18.68%
              </div>
              <div className={styles.metricChange}>
                <span className={styles.changePositive}>↑ Above Market</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button 
              className={activeTab === 'overview' ? styles.activeTab : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={activeTab === 'holdings' ? styles.activeTab : ''}
              onClick={() => setActiveTab('holdings')}
            >
              Holdings
            </button>
            <button 
              className={activeTab === 'performance' ? styles.activeTab : ''}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
            <button 
              className={activeTab === 'analysis' ? styles.activeTab : ''}
              onClick={() => setActiveTab('analysis')}
            >
              Analysis
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'overview' && (
              <>
                {/* Asset Allocation */}
                <div className={styles.allocationSection}>
                  <h2>Asset Allocation</h2>
                  <div className={styles.allocationGrid}>
                    {assetAllocation.map((asset, idx) => (
                      <div key={idx} className={styles.allocationItem}>
                        <div className={styles.allocationHeader}>
                          <span className={styles.allocationName}>{asset.category}</span>
                          <span className={styles.allocationPercent}>{asset.value}%</span>
                        </div>
                        <div className={styles.allocationBar}>
                          <div 
                            className={styles.allocationFill}
                            style={{ 
                              width: `${asset.value}%`,
                              background: asset.color
                            }}
                          />
                        </div>
                        <div className={styles.allocationValue}>
                          ${(asset.amount / 1000000).toFixed(2)}M
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Holdings Table */}
                <div className={styles.holdingsSection}>
                  <h2>Top Holdings</h2>
                  <div className={styles.tableWrapper}>
                    <table className={styles.holdingsTable}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Name</th>
                          <th>Shares</th>
                          <th>Avg Cost</th>
                          <th>Current</th>
                          <th>Value</th>
                          <th>Gain/Loss</th>
                          <th>%</th>
                          <th>Day Change</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((holding) => (
                          <tr key={holding.symbol}>
                            <td className={styles.symbolCell}>{holding.symbol}</td>
                            <td>{holding.name}</td>
                            <td>{holding.shares.toLocaleString()}</td>
                            <td>${holding.avgCost.toFixed(2)}</td>
                            <td>${holding.currentPrice.toFixed(2)}</td>
                            <td className={styles.valueCell}>
                              ${holding.value.toLocaleString()}
                            </td>
                            <td className={styles.gainCell}>
                              +${holding.gain.toLocaleString()}
                            </td>
                            <td>
                              <span className={styles.gainBadge}>
                                +{holding.gainPercent.toFixed(2)}%
                              </span>
                            </td>
                            <td className={holding.dayChange >= 0 ? styles.dayPositive : styles.dayNegative}>
                              {holding.dayChange >= 0 ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%
                            </td>
                            <td>
                              <button className={styles.actionBtn}>Trade</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'holdings' && (
              <div className={styles.holdingsSection}>
                <h2>All Holdings</h2>
                <p>Complete list of your investment holdings</p>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className={styles.performanceSection}>
                <h2>Performance Analysis</h2>
                <p>Detailed performance metrics and charts</p>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className={styles.analysisSection}>
                <h2>Portfolio Analysis</h2>
                <p>Risk assessment and portfolio optimization</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}