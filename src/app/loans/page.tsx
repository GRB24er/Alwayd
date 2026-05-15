"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./loans.module.css";

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [calculatorData, setCalculatorData] = useState({
    amount: '',
    rate: '',
    term: ''
  });

  const loans = [
    {
      id: 1,
      type: "Mortgage",
      accountNumber: "****8934",
      originalAmount: 450000,
      remainingBalance: 385420,
      monthlyPayment: 2850,
      interestRate: 3.75,
      nextPayment: "2025-09-01",
      term: "30 years",
      startDate: "2020-06-15",
      status: "active"
    },
    {
      id: 2,
      type: "Auto Loan",
      accountNumber: "****2156",
      originalAmount: 35000,
      remainingBalance: 18500,
      monthlyPayment: 650,
      interestRate: 4.25,
      nextPayment: "2025-09-05",
      term: "5 years",
      startDate: "2022-03-10",
      status: "active"
    }
  ];

  const calculateMonthlyPayment = () => {
    const principal = parseFloat(calculatorData.amount) || 0;
    const rate = (parseFloat(calculatorData.rate) || 0) / 100 / 12;
    const term = (parseFloat(calculatorData.term) || 0) * 12;
    
    if (principal && rate && term) {
      const payment = principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
      return payment.toFixed(2);
    }
    return '0.00';
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
              <h1>Loan Management</h1>
              <p>Manage your loans and explore new lending options</p>
            </div>
            <button className={styles.applyBtn}>
              <span>+</span> Apply for New Loan
            </button>
          </div>

          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>🏠</div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Total Loans</div>
                <div className={styles.cardValue}>2</div>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>💰</div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Total Outstanding</div>
                <div className={styles.cardValue}>$403,920</div>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>📅</div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>Monthly Payments</div>
                <div className={styles.cardValue}>$3,500</div>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>✅</div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>On-Time Payments</div>
                <div className={styles.cardValue}>100%</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button 
              className={activeTab === 'active' ? styles.activeTab : ''}
              onClick={() => setActiveTab('active')}
            >
              Active Loans
            </button>
            <button 
              className={activeTab === 'calculator' ? styles.activeTab : ''}
              onClick={() => setActiveTab('calculator')}
            >
              Loan Calculator
            </button>
            <button 
              className={activeTab === 'history' ? styles.activeTab : ''}
              onClick={() => setActiveTab('history')}
            >
              Payment History
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'active' && (
              <div className={styles.loansGrid}>
                {loans.map(loan => (
                  <div key={loan.id} className={styles.loanCard}>
                    <div className={styles.loanHeader}>
                      <div className={styles.loanType}>
                        <span className={styles.loanIcon}>
                          {loan.type === "Mortgage" ? "🏠" : "🚗"}
                        </span>
                        <div>
                          <h3>{loan.type}</h3>
                          <span className={styles.accountNumber}>{loan.accountNumber}</span>
                        </div>
                      </div>
                      <div className={styles.loanStatus}>Active</div>
                    </div>

                    <div className={styles.loanBalance}>
                      <div className={styles.balanceInfo}>
                        <span className={styles.label}>Remaining Balance</span>
                        <h2>${loan.remainingBalance.toLocaleString()}</h2>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ 
                            width: `${((loan.originalAmount - loan.remainingBalance) / loan.originalAmount) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className={styles.progressLabels}>
                        <span>Paid: ${(loan.originalAmount - loan.remainingBalance).toLocaleString()}</span>
                        <span>Total: ${loan.originalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={styles.loanDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Monthly Payment</span>
                        <span className={styles.detailValue}>${loan.monthlyPayment}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Interest Rate</span>
                        <span className={styles.detailValue}>{loan.interestRate}%</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Next Payment</span>
                        <span className={styles.detailValue}>{loan.nextPayment}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Loan Term</span>
                        <span className={styles.detailValue}>{loan.term}</span>
                      </div>
                    </div>

                    <div className={styles.loanActions}>
                      <button className={styles.paymentBtn}>Make Payment</button>
                      <button className={styles.detailsBtn}>View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className={styles.calculatorSection}>
                <div className={styles.calculatorCard}>
                  <h2>Loan Calculator</h2>
                  <p>Calculate your monthly payments for a new loan</p>
                  
                  <div className={styles.calculatorForm}>
                    <div className={styles.inputGroup}>
                      <label>Loan Amount</label>
                      <input 
                        type="number" 
                        placeholder="$100,000"
                        value={calculatorData.amount}
                        onChange={(e) => setCalculatorData({...calculatorData, amount: e.target.value})}
                      />
                    </div>
                    
                    <div className={styles.inputGroup}>
                      <label>Interest Rate (%)</label>
                      <input 
                        type="number" 
                        placeholder="4.5"
                        step="0.1"
                        value={calculatorData.rate}
                        onChange={(e) => setCalculatorData({...calculatorData, rate: e.target.value})}
                      />
                    </div>
                    
                    <div className={styles.inputGroup}>
                      <label>Term (Years)</label>
                      <input 
                        type="number" 
                        placeholder="30"
                        value={calculatorData.term}
                        onChange={(e) => setCalculatorData({...calculatorData, term: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className={styles.calculatorResult}>
                    <span>Estimated Monthly Payment</span>
                    <h2>${calculateMonthlyPayment()}</h2>
                  </div>

                  <button className={styles.applyNowBtn}>Apply for This Loan</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}