"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./research.module.css";

export default function ResearchPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const researchReports = [
    {
      id: 1,
      title: "Tech Sector Analysis Q4 2024",
      author: "Morgan Stanley Research",
      date: "Aug 15, 2025",
      category: "Technology",
      rating: "Buy",
      summary: "Strong growth expected in AI and cloud computing sectors with major players showing exceptional performance metrics.",
      tags: ["AI", "Cloud", "Growth"],
      readTime: "8 min"
    },
    {
      id: 2,
      title: "Federal Reserve Policy Impact",
      author: "Goldman Sachs",
      date: "Aug 14, 2025",
      category: "Macro",
      rating: "Neutral",
      summary: "Analysis of recent Fed decisions and market implications for the upcoming quarter.",
      tags: ["Fed", "Rates", "Policy"],
      readTime: "12 min"
    },
    {
      id: 3,
      title: "Energy Sector Transition Report",
      author: "JP Morgan",
      date: "Aug 13, 2025",
      category: "Energy",
      rating: "Hold",
      summary: "Renewable energy investments accelerating globally with traditional energy maintaining stability.",
      tags: ["Energy", "ESG", "Renewable"],
      readTime: "10 min"
    },
    {
      id: 4,
      title: "Healthcare Innovation Trends",
      author: "Bank of America",
      date: "Aug 12, 2025",
      category: "Healthcare",
      rating: "Buy",
      summary: "Biotech breakthroughs and AI-driven drug discovery reshaping the healthcare landscape.",
      tags: ["Biotech", "Healthcare", "Innovation"],
      readTime: "15 min"
    }
  ];

  const marketInsights = [
    { metric: "S&P 500 Target", value: "5,800", change: "+5.7%", trend: "up" },
    { metric: "GDP Growth", value: "2.3%", change: "Stable", trend: "stable" },
    { metric: "Inflation Rate", value: "3.2%", change: "-0.3%", trend: "down" },
    { metric: "10Y Treasury", value: "4.25%", change: "+0.05%", trend: "up" }
  ];

  const analystRatings = [
    { company: "Apple Inc.", symbol: "AAPL", rating: "Strong Buy", target: "$210", upside: "+11%" },
    { company: "Microsoft", symbol: "MSFT", rating: "Buy", target: "$420", upside: "+10.8%" },
    { company: "Amazon", symbol: "AMZN", rating: "Buy", target: "$200", upside: "+12.2%" },
    { company: "Tesla Inc.", symbol: "TSLA", rating: "Hold", target: "$250", upside: "+0.6%" }
  ];

  const filteredReports = activeCategory === 'all' 
    ? researchReports 
    : researchReports.filter(r => r.category.toLowerCase() === activeCategory);

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <h1>Investment Research</h1>
              <p>Market analysis, reports, and investment insights</p>
            </div>
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Search research reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Market Insights */}
          <div className={styles.insightsSection}>
            <h2>Market Insights</h2>
            <div className={styles.insightsGrid}>
              {marketInsights.map((insight, idx) => (
                <div key={idx} className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <span className={styles.insightMetric}>{insight.metric}</span>
                    <span className={`${styles.trendIcon} ${styles[insight.trend]}`}>
                      {insight.trend === 'up' && '↑'}
                      {insight.trend === 'down' && '↓'}
                      {insight.trend === 'stable' && '→'}
                    </span>
                  </div>
                  <div className={styles.insightValue}>{insight.value}</div>
                  <div className={styles.insightChange}>{insight.change}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className={styles.mainGrid}>
            {/* Reports Section */}
            <div className={styles.reportsSection}>
              {/* Category Filter */}
              <div className={styles.categoryFilter}>
                <button 
                  className={activeCategory === 'all' ? styles.active : ''}
                  onClick={() => setActiveCategory('all')}
                >
                  All Research
                </button>
                <button 
                  className={activeCategory === 'technology' ? styles.active : ''}
                  onClick={() => setActiveCategory('technology')}
                >
                  Technology
                </button>
                <button 
                  className={activeCategory === 'macro' ? styles.active : ''}
                  onClick={() => setActiveCategory('macro')}
                >
                  Macro
                </button>
                <button 
                  className={activeCategory === 'energy' ? styles.active : ''}
                  onClick={() => setActiveCategory('energy')}
                >
                  Energy
                </button>
                <button 
                  className={activeCategory === 'healthcare' ? styles.active : ''}
                  onClick={() => setActiveCategory('healthcare')}
                >
                  Healthcare
                </button>
              </div>

              {/* Research Reports */}
              <div className={styles.reportsList}>
                {filteredReports.map(report => (
                  <div key={report.id} className={styles.reportCard}>
                    <div className={styles.reportHeader}>
                      <div>
                        <h3>{report.title}</h3>
                        <div className={styles.reportMeta}>
                          <span>{report.author}</span>
                          <span className={styles.dot}>•</span>
                          <span>{report.date}</span>
                          <span className={styles.dot}>•</span>
                          <span>{report.readTime}</span>
                        </div>
                      </div>
                      <div className={`${styles.rating} ${styles[report.rating.toLowerCase().replace(' ', '')]}`}>
                        {report.rating}
                      </div>
                    </div>
                    <p className={styles.reportSummary}>{report.summary}</p>
                    <div className={styles.reportFooter}>
                      <div className={styles.tags}>
                        {report.tags.map(tag => (
                          <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                      <button className={styles.readBtn}>Read Report →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.researchSidebar}>
              {/* Analyst Ratings */}
              <div className={styles.ratingsCard}>
                <h3>Latest Analyst Ratings</h3>
                <div className={styles.ratingsList}>
                  {analystRatings.map((rating, idx) => (
                    <div key={idx} className={styles.ratingItem}>
                      <div className={styles.ratingCompany}>
                        <span className={styles.companyName}>{rating.company}</span>
                        <span className={styles.companySymbol}>{rating.symbol}</span>
                      </div>
                      <div className={styles.ratingInfo}>
                        <span className={`${styles.ratingBadge} ${styles[rating.rating.toLowerCase().replace(' ', '')]}`}>
                          {rating.rating}
                        </span>
                        <div className={styles.targetPrice}>
                          <span>Target: {rating.target}</span>
                          <span className={styles.upside}>{rating.upside}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className={styles.quickLinks}>
                <h3>Quick Links</h3>
                <a href="#">📈 Market Overview</a>
                <a href="#">📊 Earnings Calendar</a>
                <a href="#">🌍 Global Markets</a>
                <a href="#">💹 Economic Calendar</a>
                <a href="#">📰 Market News</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}