"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./cards.module.css";

const CARD_LOGOS = {
  'Visa': 'https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg',
  'Mastercard': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
  'American Express': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
  'Discover': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg'
};

export default function CardsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedCard, setSelectedCard] = useState(0);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchUserCards();
    }
  }, [session]);

  const fetchUserCards = async () => {
    try {
      const response = await fetch('/api/creditcard/apply');
      const result = await response.json();
      
      const approvedCards: any[] = [];
      
      if (result.success && result.data) {
        result.data.forEach((app: any) => {
          if (app.status === 'approved' && app.workflow?.approval?.cardDetails) {
            approvedCards.push({
              id: app._id,
              type: "Credit",
              name: getCardName(app.cardPreferences?.cardType),
              number: app.workflow.approval.cardDetails.cardNumber,
              expiry: formatExpiry(app.workflow.approval.cardDetails.expiryDate),
              cvv: app.workflow.approval.cardDetails.cvv,
              balance: app.workflow.approval.creditLimit,
              status: "Active",
              issuer: app.workflow.approval.issuer,
              cardHolder: session?.user?.name?.toUpperCase() || 'CARD HOLDER',
              interestRate: app.workflow.approval.interestRate,
              annualFee: app.workflow.approval.annualFee,
              color: getCardColor(app.cardPreferences?.cardType)
            });
          }
        });
      }
      
      setCards(approvedCards);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      setLoading(false);
    }
  };

  const getCardName = (type: string) => {
    const names: any = {
      basic: 'Premium',
      silver: 'Silver Elite',
      gold: 'Gold Executive',
      platinum: 'Platinum Prestige',
      student: 'Student Plus',
      secured: 'Secured Build',
      business: 'Business Pro'
    };
    return names[type] || 'Premium';
  };

  const getCardColor = (type: string) => {
    const colors: any = {
      basic: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
      silver: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
      gold: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
      platinum: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
      student: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
      secured: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
      business: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)'
    };
    return colors[type] || colors.basic;
  };

  const formatCardNumber = (num: string) => {
    if (!num) return '';
    return num.match(/.{1,4}/g)?.join(' ') || num;
  };

  const formatExpiry = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>💳</div>
            <p>Loading your cards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          
          <div className={styles.content}>
            <div className={styles.pageHeader}>
              <div className={styles.headerInfo}>
                <h1>Card Management</h1>
                <p>Manage your credit cards</p>
              </div>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '80px 40px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              maxWidth: '600px',
              margin: '60px auto'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>💳</div>
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                No Credit Cards Yet
              </h2>
              <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '32px' }}>
                Apply for your first premium credit card and start building your credit
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  className={styles.requestCardBtn}
                  onClick={() => router.push('/accounts/credit-cards/status')}
                  style={{ background: '#fff', color: '#D4AF37', border: '2px solid #D4AF37' }}
                >
                  📋 My Applications
                </button>
                <button 
                  className={styles.requestCardBtn}
                  onClick={() => router.push('/accounts/credit-cards/apply')}
                >
                  <span>+</span> Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[selectedCard];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div className={styles.headerInfo}>
              <h1>Card Management</h1>
              <p>Manage your credit cards</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={styles.requestCardBtn}
                onClick={() => router.push('/accounts/credit-cards/status')}
                style={{ background: '#fff', color: '#D4AF37', border: '2px solid #D4AF37' }}
              >
                📋 My Applications
              </button>
              <button 
                className={styles.requestCardBtn}
                onClick={() => router.push('/accounts/credit-cards/apply')}
              >
                <span>+</span> Apply for New Card
              </button>
            </div>
          </div>

          <div className={styles.cardSection}>
            <div className={styles.cardDisplay}>
              <div className={styles.cardVisualContainer}>
                <div 
                  className={styles.cardVisual}
                  style={{ background: currentCard.color }}
                >
                  <div className={styles.cardTop}>
                    {/* ZentriBank Logo */}
                    <img 
                      src="https://i.ibb.co/ymwC7HBZ/zentri-bank-logo.png" 
                      alt="ZentriBank"
                      style={{
                        width: '100px',
                        height: 'auto',
                        filter: 'brightness(0) invert(1)',
                        opacity: 0.95
                      }}
                    />
                    
                    {/* Card Network Logo */}
                    {currentCard.issuer && CARD_LOGOS[currentCard.issuer as keyof typeof CARD_LOGOS] && (
                      <img 
                        src={CARD_LOGOS[currentCard.issuer as keyof typeof CARD_LOGOS]} 
                        alt={currentCard.issuer}
                        style={{
                          width: '60px',
                          height: 'auto',
                          filter: 'brightness(0) invert(1)',
                          opacity: 0.95
                        }}
                      />
                    )}
                  </div>

                  {/* EMV Chip */}
                  <div style={{
                    width: '50px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #c9a436 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    padding: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                    margin: '20px 0'
                  }}>
                    <div style={{ height: '2px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '1px' }}></div>
                    <div style={{ height: '2px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '1px' }}></div>
                    <div style={{ height: '2px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '1px' }}></div>
                    <div style={{ height: '2px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '1px' }}></div>
                  </div>

                  {/* Contactless Symbol */}
                  <div style={{ position: 'absolute', right: '32px', top: '100px', opacity: 0.6 }}>
                    <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
                      <path d="M8 12C8 8.68629 10.6863 6 14 6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                      <path d="M11 12C11 10.3431 12.3431 9 14 9" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                      <path d="M5 12C5 7.02944 9.02944 3 14 3" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                      <path d="M2 12C2 5.37258 7.37258 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                    </svg>
                  </div>

                  {/* Card Number */}
                  <div className={styles.cardNumber}>
                    {formatCardNumber(currentCard.number)}
                  </div>

                  {/* Card Details */}
                  <div className={styles.cardBottom}>
                    <div>
                      <div className={styles.cardLabel}>CARD HOLDER</div>
                      <div className={styles.cardValue}>{currentCard.cardHolder}</div>
                    </div>
                    <div>
                      <div className={styles.cardLabel}>VALID THRU</div>
                      <div className={styles.cardValue}>{currentCard.expiry}</div>
                    </div>
                  </div>
                </div>

                {/* Card Selector */}
                <div className={styles.cardSelector}>
                  {cards.map((card, index) => (
                    <button
                      key={card.id}
                      className={`${styles.selectorBtn} ${selectedCard === index ? styles.selected : ''}`}
                      onClick={() => setSelectedCard(index)}
                    >
                      <span className={styles.selectorDot}></span>
                      {card.issuer} {card.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Info */}
              <div className={styles.cardInfo}>
                <h3>Card Details</h3>
                
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Card Network</span>
                    <span className={styles.infoValue}>{currentCard.issuer}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Card Type</span>
                    <span className={styles.infoValue}>{currentCard.name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={`${styles.infoValue} ${styles.statusActive}`}>
                      {currentCard.status}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Credit Limit</span>
                    <span className={styles.infoValue}>
                      ${currentCard.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>APR</span>
                    <span className={styles.infoValue}>{currentCard.interestRate}%</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Annual Fee</span>
                    <span className={styles.infoValue}>
                      ${currentCard.annualFee}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={styles.cardActions}>
                  <button className={styles.actionBtn}>
                    <span>🔒</span> Lock Card
                  </button>
                  <button className={styles.actionBtn}>
                    <span>🔢</span> Change PIN
                  </button>
                  <button className={styles.actionBtn}>
                    <span>🌍</span> Travel Notice
                  </button>
                  <button className={styles.actionBtn}>
                    <span>📊</span> View Statement
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}