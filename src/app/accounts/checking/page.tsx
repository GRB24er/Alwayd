// app/accounts/checking/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./checking.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

export default function CheckingAccountPage() {
  const [selectedAccount, setSelectedAccount] = useState("premier");

  const checkingAccounts = [
    {
      id: "premier",
      name: "Premier Checking",
      monthlyFee: "$25",
      feeWaiver: "Maintain $15,000 minimum balance",
      apy: "0.01%",
      minimumOpening: "$100",
      features: [
        "Unlimited transactions",
        "Free checks and cashier's checks",
        "Free wire transfers (domestic & international)",
        "Premium debit card with rewards",
        "ATM fee rebates worldwide",
        "24/7 priority customer service",
        "Free safety deposit box",
        "Identity theft protection"
      ],
      best_for: "High-balance customers who want premium perks"
    },
    {
      id: "advantage",
      name: "Advantage Checking",
      monthlyFee: "$12",
      feeWaiver: "Maintain $1,500 minimum balance or direct deposit $250+/month",
      apy: "0.01%",
      minimumOpening: "$25",
      features: [
        "Unlimited transactions",
        "Free online bill pay",
        "Mobile check deposit",
        "Free debit card",
        "Access to 40,000+ ATMs",
        "Overdraft protection available",
        "Email and text alerts",
        "Budgeting tools"
      ],
      best_for: "Everyday banking with moderate balances"
    },
    {
      id: "student",
      name: "Student Checking",
      monthlyFee: "$0",
      feeWaiver: "Free for students under 24",
      apy: "0.01%",
      minimumOpening: "$0",
      features: [
        "No monthly fees",
        "No minimum balance",
        "Free debit card",
        "Mobile banking app",
        "Free online transfers",
        "ATM fee rebates (up to $15/month)",
        "Financial literacy resources",
        "Parent access options"
      ],
      best_for: "College and high school students"
    },
    {
      id: "senior",
      name: "Golden Years Checking",
      monthlyFee: "$0",
      feeWaiver: "Free for customers 65+",
      apy: "0.05%",
      minimumOpening: "$25",
      features: [
        "No monthly fees for seniors",
        "Free checks",
        "Higher interest rate",
        "Free notary service",
        "Free money orders",
        "Estate planning resources",
        "Fraud protection",
        "Large-print statements available"
      ],
      best_for: "Seniors looking for fee-free banking"
    }
  ];

  const faqs = [
    {
      question: "How do I open a checking account?",
      answer: "You can open an account online in minutes, visit any branch, or call us. You'll need a valid ID, Social Security number, and initial deposit."
    },
    {
      question: "What's the difference between checking accounts?",
      answer: "Our accounts differ in monthly fees, minimum balance requirements, and features. Premier offers the most perks, while Student and Senior accounts have no fees."
    },
    {
      question: "Can I switch between account types?",
      answer: "Yes! You can upgrade or downgrade your account type at any time through online banking or by visiting a branch."
    },
    {
      question: "What overdraft protection options are available?",
      answer: "We offer overdraft transfer from savings, overdraft line of credit, and standard overdraft coverage. Fees and terms vary by option."
    },
    {
      question: "Are my deposits FDIC insured?",
      answer: "Yes, all deposit accounts are FDIC insured up to $250,000 per depositor, per insured bank, for each account ownership category."
    }
  ];

  const selectedAccountData = checkingAccounts.find(acc => acc.id === selectedAccount);

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.heroTitle}
            >
              Checking Accounts That Work As Hard As You Do
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={styles.heroSubtitle}
            >
              Choose from our range of checking accounts designed to meet your unique financial needs
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={styles.heroCTA}
            >
              <button className={styles.primaryButton}>Open Account Online</button>
              <button className={styles.secondaryButton}>Compare Accounts</button>
            </motion.div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.cardFloat}>
              <div className={styles.debitCard}>
                <div className={styles.cardChip}></div>
                <div className={styles.cardNumber}>•••• •••• •••• 1234</div>
                <div className={styles.cardName}>JOHN DOE</div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Comparison */}
        <section className={styles.comparison}>
          <h2 className={styles.sectionTitle}>Find Your Perfect Checking Account</h2>
          
          <div className={styles.accountTabs}>
            {checkingAccounts.map((account) => (
              <button
                key={account.id}
                className={`${styles.tab} ${selectedAccount === account.id ? styles.activeTab : ''}`}
                onClick={() => setSelectedAccount(account.id)}
              >
                {account.name}
              </button>
            ))}
          </div>

          {selectedAccountData && (
            <motion.div 
              key={selectedAccount}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={styles.accountDetails}
            >
              <div className={styles.detailsGrid}>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Monthly Fee</span>
                  <span className={styles.detailValue}>{selectedAccountData.monthlyFee}</span>
                  <span className={styles.detailNote}>{selectedAccountData.feeWaiver}</span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Annual Percentage Yield</span>
                  <span className={styles.detailValue}>{selectedAccountData.apy}</span>
                  <span className={styles.detailNote}>On all balances</span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Minimum to Open</span>
                  <span className={styles.detailValue}>{selectedAccountData.minimumOpening}</span>
                  <span className={styles.detailNote}>Initial deposit required</span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Best For</span>
                  <span className={styles.detailNote} style={{ marginTop: '0.5rem' }}>
                    {selectedAccountData.best_for}
                  </span>
                </div>
              </div>

              <div className={styles.featuresSection}>
                <h3>Account Features & Benefits</h3>
                <div className={styles.featuresGrid}>
                  {selectedAccountData.features.map((feature, index) => (
                    <div key={index} className={styles.feature}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.accountActions}>
                <button className={styles.primaryButton}>
                  Open {selectedAccountData.name}
                </button>
                <button className={styles.linkButton}>
                  Download Account Details (PDF)
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* Benefits Section */}
        <section className={styles.benefits}>
          <h2 className={styles.sectionTitle}>Why Choose Horizon Checking?</h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🌍</div>
              <h3>Global Access</h3>
              <p>Access your money from over 40,000 ATMs worldwide with fee rebates on Premier accounts</p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>📱</div>
              <h3>Digital Banking</h3>
              <p>Manage your account 24/7 with our award-winning mobile app and online banking</p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🛡️</div>
              <h3>Security First</h3>
              <p>FDIC insured up to $250,000 with advanced fraud protection and zero liability</p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>💳</div>
              <h3>Rewards Program</h3>
              <p>Earn cash back on debit card purchases with our Premier Checking rewards</p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className={styles.faqs}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <details key={index} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{faq.question}</summary>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2>Ready to Get Started?</h2>
            <p>Open your checking account online in just 5 minutes</p>
            <div className={styles.ctaButtons}>
              <button className={styles.primaryButton}>Open Account Now</button>
              <button className={styles.secondaryButton}>Schedule Appointment</button>
            </div>
            <p className={styles.ctaNote}>
              Or call us at 1-800-HORIZON (1-800-467-4966)
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}