"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./trading.module.css";

export default function TradingPage() {
  const [orderType, setOrderType] = useState('buy');
  const [tradeType, setTradeType] = useState('market');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const portfolio = [
    { symbol: "AAPL", shares: 5000, avgCost: 145.50, currentPrice: 189.25, value: 946250, gain: 218750, gainPercent: 30.09 },
    { symbol: "MSFT", shares: 3500, avgCost: 285.25, currentPrice: 378.85, value: 1325975, gain: 327600, gainPercent: 32.82 },
    { symbol: "GOOGL", shares: 2000, avgCost: 125.40, currentPrice: 142.65, value: 285300, gain: 34500, gainPercent: 13.74 },
    { symbol: "AMZN", shares: 4000, avgCost: 98.75, currentPrice: 178.35, value: 713400, gain: 318400, gainPercent: 80.61 }
  ];

  const recentTrades = [
    { id: 1, type: "BUY", symbol: "NVDA", shares: 500, price: 485.50, total: 242750, time: "10:45 AM", status: "Executed" },
    { id: 2, type: "SELL", symbol: "TSLA", shares: 200, price: 248.50, total: 49700, time: "10:30 AM", status: "Executed" },
    { id: 3, type: "BUY", symbol: "META", shares: 300, price: 505.33, total: 151599, time: "9:45 AM", status: "Executed" }
  ];

  const marketData = {
    AAPL: { price: 189.25, change: 2.34, changePercent: 1.24, bid: 189.24, ask: 189.26, volume: "52.3M", high: 191.50, low: 187.25 }
  };

  const calculateOrderTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const prc = tradeType === 'market' 
      ? marketData[selectedSymbol as keyof typeof marketData]?.price || 0
      : parseFloat(price) || 0;
    return (qty * prc).toFixed(2);
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerInfo}>
              <h1>Trading Platform</h1>
              <p>Execute trades with real-time market data</p>
            </div>
            <div className={styles.accountInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Buying Power</span>
                <span className={styles.infoValue}>$2,500,000</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Portfolio Value</span>
                <span className={styles.infoValue}>$45.46M</span>
              </div>
            </div>
          </div>

          <div className={styles.tradingGrid}>
            {/* Left Column - Order Form */}
            <div className={styles.leftColumn}>
              {/* Order Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Place Order</h2>
                </div>
                
                <div className={styles.cardBody}>
                  {/* Buy/Sell Toggle */}
                  <div className={styles.orderTypeToggle}>
                    <button 
                      className={`${styles.toggleBtn} ${orderType === 'buy' ? styles.buyActive : ''}`}
                      onClick={() => setOrderType('buy')}
                    >
                      BUY
                    </button>
                    <button 
                      className={`${styles.toggleBtn} ${orderType === 'sell' ? styles.sellActive : ''}`}
                      onClick={() => setOrderType('sell')}
                    >
                      SELL
                    </button>
                  </div>

                  {/* Symbol Selection */}
                  <div className={styles.formGroup}>
                    <label>Symbol</label>
                    <select 
                      value={selectedSymbol} 
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className={styles.select}
                    >
                      <option value="AAPL">AAPL - Apple Inc.</option>
                      <option value="MSFT">MSFT - Microsoft</option>
                      <option value="GOOGL">GOOGL - Alphabet</option>
                      <option value="AMZN">AMZN - Amazon</option>
                    </select>
                  </div>

                  {/* Order Type */}
                  <div className={styles.formGroup}>
                    <label>Order Type</label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          value="market" 
                          checked={tradeType === 'market'}
                          onChange={(e) => setTradeType(e.target.value)}
                        />
                        <span>Market Order</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          value="limit" 
                          checked={tradeType === 'limit'}
                          onChange={(e) => setTradeType(e.target.value)}
                        />
                        <span>Limit Order</span>
                      </label>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className={styles.formGroup}>
                    <label>Quantity</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  {/* Price (for limit orders) */}
                  {tradeType === 'limit' && (
                    <div className={styles.formGroup}>
                      <label>Limit Price</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className={styles.orderSummary}>
                    <div className={styles.summaryRow}>
                      <span>Shares</span>
                      <span>{quantity || '0'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Price</span>
                      <span>${marketData.AAPL.price.toFixed(2)}</span>
                    </div>
                    <div className={styles.summaryTotal}>
                      <span>Estimated Total</span>
                      <span className={styles.totalAmount}>${calculateOrderTotal()}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    className={`${styles.submitBtn} ${orderType === 'buy' ? styles.buyBtn : styles.sellBtn}`}
                  >
                    {orderType === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                  </button>
                </div>
              </div>

              {/* Market Data Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>Market Data - {selectedSymbol}</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.marketDataGrid}>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Price</span>
                      <span className={styles.dataValue}>${marketData.AAPL.price}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Change</span>
                      <span className={`${styles.dataValue} ${styles.positive}`}>
                        +{marketData.AAPL.changePercent}%
                      </span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Volume</span>
                      <span className={styles.dataValue}>{marketData.AAPL.volume}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Bid/Ask</span>
                      <span className={styles.dataValue}>
                        ${marketData.AAPL.bid} / ${marketData.AAPL.ask}
                      </span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Day High</span>
                      <span className={styles.dataValue}>${marketData.AAPL.high}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Day Low</span>
                      <span className={styles.dataValue}>${marketData.AAPL.low}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Holdings & Trades */}
            <div className={styles.rightColumn}>
              {/* Current Holdings */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Current Holdings</h2>
                  <button className={styles.viewAllBtn}>View All</button>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>SYMBOL</th>
                          <th>SHARES</th>
                          <th>AVG COST</th>
                          <th>CURRENT</th>
                          <th>VALUE</th>
                          <th>GAIN/LOSS</th>
                          <th>%</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.map((holding, idx) => (
                          <tr key={idx}>
                            <td className={styles.symbolCol}>{holding.symbol}</td>
                            <td>{holding.shares.toLocaleString()}</td>
                            <td>${holding.avgCost.toFixed(2)}</td>
                            <td>${holding.currentPrice.toFixed(2)}</td>
                            <td className={styles.valueCol}>${holding.value.toLocaleString()}</td>
                            <td className={styles.gainCol}>
                              <span className={styles.gainAmount}>+${holding.gain.toLocaleString()}</span>
                            </td>
                            <td className={styles.gainCol}>
                              <span className={styles.gainPercent}>+{holding.gainPercent.toFixed(2)}%</span>
                            </td>
                            <td>
                              <button className={styles.tradeBtn}>Trade</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Trades */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Recent Trades</h2>
                  <button className={styles.viewAllBtn}>View All</button>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.tradesList}>
                    {recentTrades.map(trade => (
                      <div key={trade.id} className={styles.tradeItem}>
                        <div className={styles.tradeLeft}>
                          <div className={styles.tradeHeader}>
                            <span className={`${styles.tradeType} ${trade.type === 'BUY' ? styles.buy : styles.sell}`}>
                              {trade.type}
                            </span>
                            <span className={styles.tradeSymbol}>{trade.symbol}</span>
                          </div>
                          <div className={styles.tradeDetails}>
                            {trade.shares} shares @ ${trade.price}
                          </div>
                        </div>
                        <div className={styles.tradeRight}>
                          <div className={styles.tradeTotal}>${trade.total.toLocaleString()}</div>
                          <div className={styles.tradeTime}>{trade.time}</div>
                          <div className={styles.tradeStatus}>
                            <span className={styles.statusBadge}>{trade.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}