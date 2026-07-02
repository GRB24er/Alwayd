// src/app/accounts/credit-cards/status/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './status.module.css';

interface Application {
  applicationNumber: string;
  status: string;
  cardPreferences: {
    cardType: string;
    requestedCreditLimit: number;
  };
  createdAt: string;
  workflow?: {
    submittedAt: string;
    decision?: {
      type: string;
      reason: string;
      madeAt: string;
    };
    approval?: {
      creditLimit: number;
      interestRate: number;
      annualFee: number;
      issuer: string;
      cardDetails?: {
        cardNumber: string;
        expiryDate: string;
        cvv: string;
        isActive: boolean;
      };
    };
  };
}

const CARD_TIERS: any = {
  basic: { name: 'Premium', color: '#3b82f6', icon: '💳' },
  silver: { name: 'Silver Elite', color: '#94a3b8', icon: '🥈' },
  gold: { name: 'Gold Executive', color: '#f59e0b', icon: '🥇' },
  platinum: { name: 'Platinum Prestige', color: '#8b5cf6', icon: '💎' },
  student: { name: 'Student Plus', color: '#10b981', icon: '🎓' },
  secured: { name: 'Secured Build', color: '#64748b', icon: '🔒' },
  business: { name: 'Business Pro', color: '#ef4444', icon: '💼' }
};

export default function ApplicationStatusPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      console.log('🔍 Fetching applications...');
      const response = await fetch('/api/creditcard/apply');
      const result = await response.json();
      
      console.log('📊 API Response:', result);
      
      if (result.success) {
        console.log('✅ Applications data:', result.data);
        result.data.forEach((app: any, index: number) => {
          console.log(`📋 App ${index + 1}:`, {
            status: app.status,
            cardType: app.cardPreferences?.cardType,
            requestedLimit: app.cardPreferences?.requestedCreditLimit,
            hasWorkflow: !!app.workflow,
            hasApproval: !!app.workflow?.approval,
            approvedLimit: app.workflow?.approval?.creditLimit
          });
        });
        setApplications(result.data || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardTier = (type: string) => {
    return CARD_TIERS[type] || CARD_TIERS.basic;
  };

  const formatCardNumber = (num: string) => {
    if (!num) return '';
    return num.match(/.{1,4}/g)?.join(' ') || num;
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1>My Credit Card Applications</h1>
              <p>Track and manage your credit card applications</p>
            </div>
            <button 
              className={styles.applyBtn}
              onClick={() => router.push('/accounts/credit-cards/apply')}
            >
              <span>+</span> Apply for New Card
            </button>
          </div>

          {applications.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💳</div>
              <h2>No Applications Yet</h2>
              <p>Start your journey to financial freedom with a premium credit card</p>
              <button
                className={styles.startBtn}
                onClick={() => router.push('/accounts/credit-cards/apply')}
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className={styles.applicationsGrid}>
              {applications.map((app) => {
                const tier = getCardTier(app.cardPreferences?.cardType);
                const isApproved = app.status === 'approved';
                const isPending = app.status === 'submitted' || app.status === 'under_review';
                const isDeclined = app.status === 'declined';
                
                // Use approved limit if exists, otherwise requested limit
                const displayLimit = isApproved && app.workflow?.approval?.creditLimit 
                  ? app.workflow.approval.creditLimit 
                  : app.cardPreferences?.requestedCreditLimit;

                console.log('💳 Displaying card:', {
                  status: app.status,
                  isApproved,
                  approvedLimit: app.workflow?.approval?.creditLimit,
                  requestedLimit: app.cardPreferences?.requestedCreditLimit,
                  displayLimit
                });

                return (
                  <div
                    key={app.applicationNumber}
                    className={`${styles.applicationCard} ${isApproved ? styles.approved : ''} ${isDeclined ? styles.declined : ''}`}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTier}>
                        <span className={styles.tierIcon}>{tier.icon}</span>
                        <div>
                          <h3>{tier.name}</h3>
                          <p className={styles.appNumber}>{app.applicationNumber}</p>
                        </div>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                        {app.status === 'submitted' ? '⏳ Pending' : 
                         app.status === 'approved' ? '✅ Approved' : 
                         app.status === 'declined' ? '❌ Declined' : 
                         '🔍 Under Review'}
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.infoRow}>
                        <div className={styles.infoItem}>
                          <span className={styles.label}>Submitted</span>
                          <span className={styles.value}>
                            {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.label}>{isApproved ? 'Approved Limit' : 'Requested Limit'}</span>
                          <span className={styles.value} style={{ color: isApproved ? '#059669' : '#1e293b' }}>
                            ${displayLimit?.toLocaleString()}
                          </span>
                        </div>
                        {isApproved && app.workflow?.approval?.creditLimit && (
                          <div className={styles.infoItem}>
                            <span className={styles.label}>Card Type</span>
                            <span className={styles.value}>{tier.name}</span>
                          </div>
                        )}
                      </div>

                      {isApproved && app.workflow?.approval && (
                        <div className={styles.approvalSection}>
                          <div className={styles.approvalHeader}>
                            <span className={styles.congrats}>🎉 Congratulations! Your {tier.name} Card is Approved</span>
                          </div>
                          
                          <div className={styles.approvalGrid}>
                            <div className={styles.approvalItem}>
                              <span className={styles.approvalLabel}>Credit Limit</span>
                              <span className={styles.approvalValue}>${app.workflow.approval.creditLimit?.toLocaleString()}</span>
                            </div>
                            <div className={styles.approvalItem}>
                              <span className={styles.approvalLabel}>APR</span>
                              <span className={styles.approvalValue}>{app.workflow.approval.interestRate}%</span>
                            </div>
                            <div className={styles.approvalItem}>
                              <span className={styles.approvalLabel}>Annual Fee</span>
                              <span className={styles.approvalValue}>${app.workflow.approval.annualFee}</span>
                            </div>
                            <div className={styles.approvalItem}>
                              <span className={styles.approvalLabel}>Card Network</span>
                              <span className={styles.approvalValue}>{app.workflow.approval.issuer}</span>
                            </div>
                          </div>

                          {app.workflow.approval.cardDetails && (
                            <div className={styles.cardDetails}>
                              <div className={styles.cardVisual} style={{ background: tier.color }}>
                                <div className={styles.cardLogo}>{app.workflow.approval.issuer}</div>
                                <div className={styles.cardChip}></div>
                                <div className={styles.cardNumber}>
                                  {formatCardNumber(app.workflow.approval.cardDetails.cardNumber)}
                                </div>
                                <div className={styles.cardFooter}>
                                  <div>
                                    <span className={styles.cardLabel}>VALID THRU</span>
                                    <span className={styles.cardExpiry}>
                                      {new Date(app.workflow.approval.cardDetails.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={styles.cardLabel}>CVV</span>
                                    <span className={styles.cardCvv}>{app.workflow.approval.cardDetails.cvv}</span>
                                  </div>
                                </div>
                              </div>
                              <p className={styles.deliveryNote}>
                                📦 Your card will arrive in 7-10 business days
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {isDeclined && app.workflow?.decision && (
                        <div className={styles.declinedSection}>
                          <p className={styles.declinedReason}>
                            <strong>Reason:</strong> {app.workflow.decision.reason || 'Application did not meet requirements'}
                          </p>
                          <button 
                            className={styles.reapplyBtn}
                            onClick={() => router.push('/accounts/credit-cards/apply')}
                          >
                            Apply Again
                          </button>
                        </div>
                      )}

                      {isPending && (
                        <div className={styles.pendingSection}>
                          <p>⏳ Your application is being reviewed. We'll notify you within 1-2 business days.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}