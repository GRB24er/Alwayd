// app/accounts/savings/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./savings.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

export default function SavingsAccountPage() {
  const [calculatorAmount, setCalculatorAmount] = useState(10000);
  const [calculatorMonths, setCalculatorMonths] = useState(12);
  const [selectedRate, setSelectedRate] = useState(4.5);

  const savingsAccounts = [
    {
      name: "High Yield Savings",
      apy: "4.50%",
      minimumBalance: "$0",
      monthlyFee: "$0",
      features: [
        "No minimum balance requirement",
        "No monthly maintenance fees",
        "6 free withdrawals per month",
        "Mobile check deposit",
        "Automatic savings plans",
        "FDIC insured up to $250,000"
      ]
    },
    {
      name: "Premium Money Market",
      apy: "4.75%",
      minimumBalance: "$25,000",
      monthlyFee: "$0",
      features: [
        "Higher APY for larger balances",
        "Unlimited ATM access",
        "Free checks",
        "Tiered interest rates",
        "Premium customer service",
        "Free wire transfers"
      ]
    },
    {
      name: "Kids Savings",
      apy: "3.00%",
      minimumBalance: "$0",
      monthlyFee: "$0",
      features: [
        "No minimum balance",
        "Parent/guardian joint ownership",
        "Financial education resources",
        "Savings goal tracker",
        "Birthday bonus deposits",
        "Fun mobile app for kids"
      ]
    }
  ];

  const calculateInterest = () => {
    const principal = calculatorAmount;
    const rate = selectedRate / 100;
    const time = calculatorMonths / 12;
    const interest = principal * rate * time;
    const total = principal + interest;
    return { interest, total };
  };

  const { interest, total } = calculateInterest();

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.heroContent}
            >
              <h1 className={styles.heroTitle}>
                Grow Your Savings with 
                <span className={styles.highlight}> Up to 4.75% APY</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Start saving smarter with our high-yield savings accounts. 
                No fees, no minimum balance, just pure growth.
              </p>
              <div className={styles.heroStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>4.75%</span>
                  <span className={styles.statLabel}>Max APY</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>$0</span>
                  <span className={styles.statLabel}>Monthly Fees</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>$0</span>
                  <span className={styles.statLabel}>Minimum Balance</span>
                </div>
              </div>
              <button className={styles.ctaButton}>
                Open Savings Account →
              </button>
            </motion.div>
          </div>
        </section>

        {/* Savings Calculator */}
        <section className={styles.calculator}>
          <h2 className={styles.sectionTitle}>Calculate Your Earnings</h2>
          <div className={styles.calculatorCard}>
            <div className={styles.calculatorInputs}>
              <div className={styles.inputGroup}>
                <label>Initial Deposit</label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(Number(e.target.value))}
                />
                <div className={styles.inputValue}>
                  ${calculatorAmount.toLocaleString()}
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Time Period (Months)</label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={calculatorMonths}
                  onChange={(e) => setCalculatorMonths(Number(e.target.value))}
                />
                <div className={styles.inputValue}>{calculatorMonths} months</div>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Interest Rate (APY)</label>
                <select 
                  value={selectedRate} 
                  onChange={(e) => setSelectedRate(Number(e.target.value))}
                  className={styles.rateSelect}
                >
                  <option value={3.0}>3.00% - Kids Savings</option>
                  <option value={4.5}>4.50% - High Yield Savings</option>
                  <option value={4.75}>4.75% - Premium Money Market</option>
                </select>
              </div>
            </div>
            
            <div className={styles.calculatorResults}>
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>Interest Earned</span>
                <span className={styles.resultValue}>
                  ${interest.toFixed(2)}
                </span>
              </div>
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>Total Balance</span>
                <span className={styles.resultValue}>
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Account Types */}
        <section className={styles.accountTypes}>
          <h2 className={styles.sectionTitle}>Choose Your Savings Account</h2>
          <div className={styles.accountsGrid}>
            {savingsAccounts.map((account, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={styles.accountCard}
              >
                <div className={styles.accountHeader}>
                  <h3>{account.name}</h3>
                  <div className={styles.apyBadge}>{account.apy} APY</div>
                </div>
                
                <div className={styles.accountDetails}>
                  <div className={styles.detailRow}>
                    <span>Minimum Balance:</span>
                    <strong>{account.minimumBalance}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Monthly Fee:</span>
                    <strong>{account.monthlyFee}</strong>
                  </div>
                </div>
                
                <div className={styles.accountFeatures}>
                  <h4>Features:</h4>
                  <ul>
                    {account.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
                
                <button className={styles.accountCTA}>
                 Open {account.name}
               </button>
             </motion.div>
           ))}
         </div>
       </section>

       {/* Benefits Section */}
       <section className={styles.benefits}>
         <h2 className={styles.sectionTitle}>Why Save with Horizon?</h2>
         <div className={styles.benefitsGrid}>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>🛡️</div>
             <h3>FDIC Insured</h3>
             <p>Your deposits are insured up to $250,000 per depositor</p>
           </div>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>📈</div>
             <h3>Competitive Rates</h3>
             <p>Earn up to 10x the national average savings rate</p>
           </div>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>🔄</div>
             <h3>Auto-Save Features</h3>
             <p>Set up automatic transfers to build savings effortlessly</p>
           </div>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>📱</div>
             <h3>24/7 Access</h3>
             <p>Manage your savings anytime with our mobile app</p>
           </div>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>🎯</div>
             <h3>Goal Tracking</h3>
             <p>Set and track multiple savings goals in one place</p>
           </div>
           <div className={styles.benefitItem}>
             <div className={styles.benefitIcon}>💰</div>
             <h3>No Hidden Fees</h3>
             <p>What you see is what you get - no surprises</p>
           </div>
         </div>
       </section>

       <Footer />
     </div>
   </div>
 );
}