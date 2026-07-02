"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./watchlist.module.css";

export default function WatchlistPage() {
  const [selectedTab, setSelectedTab] = useState('myWatchlist');
  const [viewMode, setViewMode] = useState('grid');
  
  const watchlistItems = [
    { 
      symbol: "AAPL", 
      name: "Apple Inc.", 
      price: 189.25, 
      change: 2.34, 
      changePercent: 1.24, 
      volume: "52.3M", 
      marketCap: "2.95T",
      dayHigh: 191.50,
      dayLow: 187.25,
      yearHigh: 199.62,
      yearLow: 164.08,
      pe: 31.2,
      alerts: 2
    },
    { 
      symbol: "GOOGL", 
      name: "Alphabet Inc.", 
      price: 142.65, 
      change: -1.23, 
      changePercent: -0.86, 
      volume: "28.1M", 
      marketCap: "1.82T",
      dayHigh: 144.20,
      dayLow: 141.80,
      yearHigh: 155.38,
      yearLow: 101.88,
      pe: 27.5,
      alerts: 0
    },
    { 
      symbol: "MSFT", 
      name: "Microsoft", 
      price: 378.85, 
      change: 5.67, 
      changePercent: 1.52, 
      volume: "22.8M", 
      marketCap: "2.81T",
      dayHigh: 380.50,
      dayLow: 375.20,
      yearHigh: 384.60,
      yearLow: 275.37,
      pe: 35.8,
      alerts: 1
    },
    { 
      symbol: "AMZN", 
      name: "Amazon", 
      price: 178.35, 
      change: 3.45, 
      changePercent: 1.97, 
      volume: "38.5M", 
      marketCap: "1.85T",
      dayHigh: 179.80,
      dayLow: 175.50,
      yearHigh: 188.65,
      yearLow: 118.35,
      pe: 68.2,
      alerts: 0
    },
    { 
      symbol: "TSLA", 
      name: "Tesla Inc.", 
      price: 248.50, 
      change: -8.90, 
      changePercent: -3.46, 
      volume: "118.2M", 
      marketCap: "789B",
      dayHigh: 258.40,
      dayLow: 245.10,
      yearHigh: 299.29,
      yearLow: 152.37,
      pe: 78.5,
      alerts: 3
    },
    { 
      symbol: "META", 
      name: "Meta Platforms", 
      price: 505.33, 
      change: 12.45, 
      changePercent: 2.52, 
      volume: "16.3M", 
      marketCap: "1.29T",
      dayHigh: 508.90,
      dayLow: 495.20,
      yearHigh: 542.81,
      yearLow: 274.38,
      pe: 38.9,
      alerts: 0
    }
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
              <h1>Investment Watchlist</h1>
              <p>Track your favorite stocks and get real-time updates</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.addBtn}>
                <span>+</span> Add Symbol
              </button>
              <button className={styles.alertBtn}>
                <span>🔔</span> Alerts (6)
              </button>
            </div>
          </div>

          {/* Tabs and View Toggle */}
          <div className={styles.controls}>
            <div className={styles.tabs}>
              <button 
                className={selectedTab === 'myWatchlist' ? styles.activeTab : ''}
                onClick={() => setSelectedTab('myWatchlist')}
              >
                My Watchlist
              </button>
              <button 
                className={selectedTab === 'trending' ? styles.activeTab : ''}
                onClick={() => setSelectedTab('trending')}
              >
                Trending
              </button>
              <button 
                className={selectedTab === 'gainers' ? styles.activeTab : ''}
                onClick={() => setSelectedTab('gainers')}
              >
                Top Gainers
              </button>
              <button 
                className={selectedTab === 'losers' ? styles.activeTab : ''}
                onClick={() => setSelectedTab('losers')}
              >
                Top Losers
              </button>
            </div>
            
            <div className={styles.viewToggle}>
              <button 
                className={viewMode === 'grid' ? styles.active : ''}
                onClick={() => setViewMode('grid')}
              >
                <span>⊞</span>
              </button>
              <button 
                className={viewMode === 'list' ? styles.active : ''}
                onClick={() => setViewMode('list')}
              >
                <span>☰</span>
              </button>
            </div>
          </div>

          {/* Watchlist Content */}
          {viewMode === 'grid' ? (
            <div className={styles.watchlistGrid}>
              {watchlistItems.map(item => (
                <div key={item.symbol} className={styles.watchlistCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.symbolInfo}>
                      <div className={styles.symbol}>{item.symbol}</div>
                      <div className={styles.companyName}>{item.name}</div>
                    </div>
                    {item.alerts > 0 && (
                      <span className={styles.alertBadge}>{item.alerts}</span>
                    )}
                  </div>
                  
                  <div className={styles.priceSection}>
                    <div className={styles.currentPrice}>${item.price}</div>
                    <div className={item.change >= 0 ? styles.changePositive : styles.changeNegative}>
                      {item.change >= 0 ? '+' : ''}{item.change} ({item.changePercent}%)
                    </div>
                  </div>
                  
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Volume</span>
                      <span className={styles.statValue}>{item.volume}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Market Cap</span>
                      <span className={styles.statValue}>{item.marketCap}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Day Range</span>
                      <span className={styles.statValue}>${item.dayLow} - ${item.dayHigh}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>P/E Ratio</span>
                      <span className={styles.statValue}>{item.pe}</span>
                    </div>
                  </div>
                  
                  <div className={styles.cardActions}>
                    <button className={styles.tradeBtn}>Trade</button>
                    <button className={styles.chartBtn}>Chart</button>
                    <button className={styles.alertSetBtn}>Alert</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.watchlistTable}>
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Volume</th>
                    <th>Market Cap</th>
                    <th>Day Range</th>
                    <th>P/E</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistItems.map(item => (
                    <tr key={item.symbol}>
                      <td className={styles.symbolCol}>
                        {item.symbol}
                        {item.alerts > 0 && (
                          <span className={styles.alertDot}></span>
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td className={styles.priceCol}>${item.price}</td>
                      <td className={item.change >= 0 ? styles.positive : styles.negative}>
                        {item.change >= 0 ? '+' : ''}{item.change}
                      </td>
                      <td className={item.change >= 0 ? styles.positive : styles.negative}>
                        {item.changePercent}%
                      </td>
                      <td>{item.volume}</td>
                      <td>{item.marketCap}</td>
                      <td>${item.dayLow} - ${item.dayHigh}</td>
                      <td>{item.pe}</td>
                      <td>
                       <div className={styles.tableActions}>
                         <button className={styles.actionBtn}>Trade</button>
                         <button className={styles.moreBtn}>⋮</button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}