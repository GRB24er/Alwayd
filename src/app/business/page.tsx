// src/app/business/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./business.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

export default function BusinessBankingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "apply">("overview");

  const businessAccounts = [
    {
      name: "Business Checking",
      minBalance: "$2,500",
      monthlyFee: "$25",
      features: [
        "500 free transactions per month",
        "Online and mobile banking",
        "Free wire transfers (5/month)",
        "Multi-user access",
        "QuickBooks integration"
      ],
      bestFor: "Small to medium businesses"
    },
    {
      name: "Business Savings",
      minBalance: "$5,000",
      apy: "2.50%",
      features: [
        "Competitive interest rates",
        "No monthly maintenance fee",
        "6 free withdrawals per month",
        "Sweep account options",
        "FDIC insured up to $250,000"
      ],
      bestFor: "Building business reserves"
    },
    {
      name: "Business Money Market",
      minBalance: "$10,000",
      apy: "3.25%",
      features: [
        "Tiered interest rates",
        "Check writing privileges",
        "Debit card access",
        "Premium rates for higher balances",
        "Daily compounding interest"
      ],
      bestFor: "High balance accounts"
    }
  ];

  const services = [
    { icon: "💳", title: "Corporate Cards", desc: "Expense management made easy" },
    { icon: "💰", title: "Merchant Services", desc: "Accept payments anywhere" },
    { icon: "📊", title: "Payroll Services", desc: "Automated payroll processing" },
    { icon: "🔄", title: "Cash Management", desc: "Optimize your cash flow" },
    { icon: "🌍", title: "International Banking", desc: "Global payment solutions" },
    { icon: "📈", title: "Business Loans", desc: "Grow your business faster" }
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.heroTitle}
            >
              Banking Solutions for Your Business
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={styles.heroSubtitle}
            >
              Powerful tools and services to help your business thrive
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={styles.heroCTA}
            >
              <button 
                className={styles.primaryButton}
                onClick={() => setActiveTab("apply")}
              >
                Open Business Account
              </button>
              <button className={styles.secondaryButton}>
                Schedule Consultation
              </button>
            </motion.div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.illustration}>💼</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === "services" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("services")}
          >
            Services & Features
          </button>
          <button
            className={`${styles.tab} ${activeTab === "apply" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("apply")}
          >
            Apply Now
          </button>
        </div>

        <div className={styles.container}>
          {activeTab === "overview" && (
            <div className={styles.overviewContent}>
              {/* Business Accounts */}
              <section className={styles.accountsSection}>
                <h2 className={styles.sectionTitle}>Business Account Options</h2>
                <div className={styles.accountsGrid}>
                  {businessAccounts.map((account, index) => (
                    <motion.div
                      key={index}
                      className={styles.accountCard}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <h3>{account.name}</h3>
                      <div className={styles.accountDetails}>
                        {account.minBalance && (
                          <div className={styles.detailItem}>
                            <span>Minimum Balance:</span>
                            <strong>{account.minBalance}</strong>
                          </div>
                        )}
                        {account.monthlyFee && (
                          <div className={styles.detailItem}>
                            <span>Monthly Fee:</span>
                            <strong>{account.monthlyFee}</strong>
                          </div>
                        )}
                        {account.apy && (
                          <div className={styles.detailItem}>
                            <span>APY:</span>
                            <strong>{account.apy}</strong>
                          </div>
                        )}
                      </div>
                      <div className={styles.features}>
                        <h4>Features:</h4>
                        <ul>
                          {account.features.map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                      <div className={styles.bestFor}>
                        <span>Best for:</span> {account.bestFor}
                      </div>
                      <button className={styles.selectButton}>
                        Select This Account
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Why Choose Us */}
              <section className={styles.whyUsSection}>
                <h2 className={styles.sectionTitle}>Why Businesses Choose Horizon</h2>
                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitCard}>
                    <div className={styles.benefitIcon}>🏆</div>
                    <h3>Industry-Leading Technology</h3>
                    <p>Advanced online platform with API integrations for seamless operations</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <div className={styles.benefitIcon}>🤝</div>
                    <h3>Dedicated Support</h3>
                    <p>Personal relationship manager and 24/7 business support team</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <div className={styles.benefitIcon}>📈</div>
                    <h3>Scalable Solutions</h3>
                    <p>Banking that grows with your business, from startup to enterprise</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <div className={styles.benefitIcon}>💎</div>
                    <h3>Competitive Pricing</h3>
                    <p>Transparent fees with volume discounts and custom pricing options</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "services" && (
            <div className={styles.servicesContent}>
              <h2 className={styles.sectionTitle}>Complete Business Banking Services</h2>
              <div className={styles.servicesGrid}>
                {services.map((service, index) => (
                  <motion.div
                    key={index}
                    className={styles.serviceCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className={styles.serviceIcon}>{service.icon}</div>
                    <h3>{service.title}</h3>
                    <p>{service.desc}</p>
                    <button className={styles.learnMoreButton}>Learn More →</button>
                  </motion.div>
                ))}
              </div>

              {/* Additional Services */}
              <div className={styles.additionalServices}>
                <h3>Additional Benefits</h3>
                <div className={styles.benefitsList}>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Free business financial consultation</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Accounting software integration</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Fraud protection and monitoring</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Mobile check deposit</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Business credit building</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Tax preparation assistance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "apply" && (
            <div className={styles.applyContent}>
              <h2 className={styles.sectionTitle}>Open Your Business Account</h2>
              <div className={styles.applicationForm}>
                <div className={styles.formSection}>
                  <h3>Business Information</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Business Name</label>
                      <input type="text" placeholder="Enter business name" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Business Type</label>
                      <select>
                        <option>Select type</option>
                        <option>LLC</option>
                        <option>Corporation</option>
                        <option>Partnership</option>
                        <option>Sole Proprietorship</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>EIN/Tax ID</label>
                      <input type="text" placeholder="XX-XXXXXXX" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Annual Revenue</label>
                      <select>
                        <option>Select range</option>
                        <option>$0 - $100,000</option>
                        <option>$100,000 - $500,000</option>
                        <option>$500,000 - $1M</option>
                        <option>$1M+</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3>Contact Information</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Your Name</label>
                      <input type="text" placeholder="Full name" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Title/Position</label>
                      <input type="text" placeholder="e.g., CEO, Owner" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email</label>
                      <input type="email" placeholder="business@example.com" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Phone</label>
                      <input type="tel" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button className={styles.submitButton}>
                    Submit Application
                  </button>
                  <p className={styles.disclaimer}>
                    By submitting, you agree to our terms and conditions. 
                    A representative will contact you within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}