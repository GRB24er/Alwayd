"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./landing.module.css";

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setShowModal(true), 2500);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const products = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
        </svg>
      ),
      title: "Premier Checking",
      description: "Elite checking with unlimited transfers, premium rates, and dedicated concierge support"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      title: "High-Yield Savings",
      description: "Competitive rates with flexible access and compound growth strategies"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <path d="M3 3v18h18"/>
          <path d="M18 17V9"/>
          <path d="M13 17V5"/>
          <path d="M8 17v-3"/>
        </svg>
      ),
      title: "Investment Portfolio",
      description: "Diversified investment solutions managed by expert advisors"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      ),
      title: "Wealth Protection",
      description: "Trust services and estate planning for generational wealth preservation"
    }
  ];

  const features = [
    {
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&h=400&fit=crop",
      title: "Private Banking Excellence",
      description: "Bespoke financial solutions tailored to sophisticated investors. Experience banking designed for your lifestyle.",
      cta: "Apply Now",
      link: "/auth/signup"
    },
    {
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop",
      title: "Institutional-Grade Security",
      description: "256-bit encryption, biometric authentication, and 24/7 fraud monitoring protect your assets.",
      cta: "Learn More",
      link: "#security"
    },
    {
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
      title: "Global Market Access",
      description: "Multi-currency accounts and international wire transfers with preferential exchange rates.",
      cta: "Explore",
      link: "#features"
    }
  ];

  const services = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <path d="M12 18h.01"/>
        </svg>
      ),
      title: "Digital Banking Suite",
      description: "Full-featured mobile and web platform with real-time portfolio tracking",
      link: "/banking/online"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      ),
      title: "Private Client Services",
      description: "Dedicated relationship manager available around the clock",
      link: "/contact"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      title: "Global Presence",
      description: "Access your accounts from anywhere with worldwide ATM network",
      link: "/locations"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'40px',height:'40px'}}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Advisory Consultation",
      description: "Schedule a private consultation with our wealth advisors",
      link: "/appointments"
    }
  ];

  return (
    <div className={styles.landingPage}>
      {/* Welcome Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModal} onClick={() => setShowModal(false)}>×</button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'48px',height:'48px',color:'#c9a962'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <h2 className={styles.modalTitle}>Welcome to Aldwych</h2>
              <p className={styles.modalSubtitle}>European Capital • Private Banking</p>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.welcomeMessage}>
                <h3>Experience Elite Private Banking</h3>
                <ul className={styles.benefitsList}>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    Dedicated relationship manager
                  </li>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    Institutional-grade security
                  </li>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    Preferential rates & terms
                  </li>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    24/7 concierge support
                  </li>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    Global portfolio access
                  </li>
                  <li>
                    <span className={styles.checkIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    Wealth preservation strategies
                  </li>
                </ul>
              </div>

              <div className={styles.modalInfo}>
                <div className={styles.infoItem}>
                  <strong>Private Banking</strong>
                  <p>By invitation</p>
                </div>
                <div className={styles.infoItem}>
                  <strong>Concierge</strong>
                  <p>24/7 Available</p>
                </div>
                <div className={styles.infoItem}>
                  <strong>Global Access</strong>
                  <p>180+ Countries</p>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => {
                setShowModal(false);
                router.push('/auth/signup');
              }} className={styles.btnModalPrimary}>
                Apply for Membership
              </button>
              <button onClick={() => setShowModal(false)} className={styles.btnModalSecondary}>
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.container}>
            <div className={styles.topBarContent}>
              <div className={styles.topBarLeft}>
                <span className={styles.statusIndicator}>
                  <span className={styles.statusDot}></span>
                  All Systems Operational
                </span>
              </div>
              <nav className={styles.utilityNav}>
                <Link href="/locations">Global Offices</Link>
                <Link href="/contact">Private Client Services</Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className={styles.mainHeader}>
          <div className={styles.container}>
            <div className={styles.headerContent}>
              <Link href="/" className={styles.logo}>
                <img
                  src="/images/Logo.png"
                  alt="Aldwych European Capital"
                  className={styles.logoImage}
                />
              </Link>

              <nav className={styles.primaryNav}>
                <div 
                  className={styles.navItem}
                  onMouseEnter={() => setActiveNav('personal')}
                  onMouseLeave={() => setActiveNav(null)}
                >
                  <button className={styles.navLink}>Private Banking</button>
                  {activeNav === 'personal' && (
                    <div className={styles.dropdown}>
                      <Link href="/checking">Premier Checking</Link>
                      <Link href="/savings">High-Yield Savings</Link>
                      <Link href="/credit-cards">Elite Cards</Link>
                      <Link href="/loans">Private Credit</Link>
                      <Link href="/mortgages">Property Finance</Link>
                    </div>
                  )}
                </div>

                <div 
                  className={styles.navItem}
                  onMouseEnter={() => setActiveNav('wealth')}
                  onMouseLeave={() => setActiveNav(null)}
                >
                  <button className={styles.navLink}>Wealth Management</button>
                  {activeNav === 'wealth' && (
                    <div className={styles.dropdown}>
                      <Link href="/wealth/advisory">Investment Advisory</Link>
                      <Link href="/wealth/retirement">Retirement Planning</Link>
                      <Link href="/wealth/trust">Trust & Estate</Link>
                      <Link href="/wealth/private">Family Office</Link>
                    </div>
                  )}
                </div>

                <div 
                  className={styles.navItem}
                  onMouseEnter={() => setActiveNav('markets')}
                  onMouseLeave={() => setActiveNav(null)}
                >
                  <button className={styles.navLink}>Markets</button>
                  {activeNav === 'markets' && (
                    <div className={styles.dropdown}>
                      <Link href="/markets/forex">Foreign Exchange</Link>
                      <Link href="/markets/commodities">Commodities</Link>
                      <Link href="/markets/fixed-income">Fixed Income</Link>
                      <Link href="/markets/equities">Equities</Link>
                    </div>
                  )}
                </div>

                <Link href="/about" className={styles.navLink}>About</Link>
              </nav>

              <div className={styles.headerActions}>
                <Link href="/auth/signin" className={styles.btnLogin}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px',height:'16px'}}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Client Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroPattern}></div>
          <div className={styles.heroGlow}></div>
        </div>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.heroBadge}>
                <span>European Private Banking</span>
              </div>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroHighlight}>Private</span> Banking
                <br />Excellence
              </h1>
              <p className={styles.heroDescription}>
                Discreet wealth management for sophisticated investors. 
                Experience precision-engineered financial solutions designed 
                for optimal control and performance.
              </p>
              <div className={styles.heroActions}>
                <Link href="/auth/signup" className={styles.btnPrimary}>
                  Apply for Membership
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'18px',height:'18px'}}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
                <Link href="/about" className={styles.btnSecondary}>
                  Learn More
                </Link>
              </div>
              <div className={styles.heroStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>$48B+</span>
                  <span className={styles.statLabel}>Assets Under Management</span>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>180+</span>
                  <span className={styles.statLabel}>Countries Served</span>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>1897</span>
                  <span className={styles.statLabel}>Established</span>
                </div>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardChip}></span>
                  <span className={styles.cardLogo}>ALDWYCH</span>
                </div>
                <div className={styles.cardNumber}>•••• •••• •••• 4589</div>
                <div className={styles.cardFooter}>
                  <div>
                    <span className={styles.cardLabel}>Card Holder</span>
                    <span className={styles.cardName}>PLATINUM MEMBER</span>
                  </div>
                  <div>
                    <span className={styles.cardLabel}>Valid Thru</span>
                    <span className={styles.cardName}>12/28</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Products Grid */}
      <section className={styles.productsGrid}>
        <div className={styles.container}>
          <div className={styles.gridRow}>
            {products.map((product, index) => (
              <div key={index} className={styles.productCard}>
                <div className={styles.productIcon}>{product.icon}</div>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <p className={styles.productDesc}>{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers */}
      <section className={styles.featuredSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Exceptional Service, Exceptional Results</h2>
            <p>Discover the Aldwych advantage</p>
          </div>
          <div className={styles.featuresRow}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureImage}>
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className={styles.featImg}
                  />
                </div>
                <div className={styles.featureContent}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <Link href={feature.link} className={styles.featureLink}>
                    {feature.cta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px',height:'16px'}}>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className={styles.trustSection}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'28px',height:'28px'}}>
                  <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                </svg>
              </span>
              <div>
                <div className={styles.trustTitle}>FCA</div>
                <div className={styles.trustLabel}>Regulated</div>
              </div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'28px',height:'28px'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </span>
              <div>
                <div className={styles.trustTitle}>256-bit</div>
                <div className={styles.trustLabel}>Encrypted</div>
              </div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'28px',height:'28px'}}>
                  <polyline points="9 11 12 14 22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </span>
              <div>
                <div className={styles.trustTitle}>SOC 2</div>
                <div className={styles.trustLabel}>Compliant</div>
              </div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'28px',height:'28px'}}>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <div>
                <div className={styles.trustTitle}>24/7</div>
                <div className={styles.trustLabel}>Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className={styles.servicesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>White-Glove Service</h2>
            <p>Concierge banking at your fingertips</p>
          </div>
          <div className={styles.servicesGrid}>
            {services.map((service, index) => (
              <div key={index} className={styles.serviceCard}>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <Link href={service.link} className={styles.serviceLink}>
                  Learn More
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px',height:'14px'}}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2>Ready to Experience Elite Banking?</h2>
            <p>Join a select group of clients who demand excellence</p>
            <div className={styles.ctaActions}>
              <Link href="/auth/signup" className={styles.btnCtaPrimary}>
                Apply for Membership
              </Link>
              <Link href="/contact" className={styles.btnCtaSecondary}>
                Schedule Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <img
                  src="/images/Logo.png"
                  alt="Aldwych European Capital"
                  className={styles.footerLogoImage}
                />
              </div>
              <p className={styles.footerTagline}>
                European Private Banking Excellence Since 1897
              </p>
              <div className={styles.footerSocial}>
                <a href="#" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'20px',height:'20px'}}>
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'20px',height:'20px'}}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className={styles.footerColumn}>
              <h4>Private Banking</h4>
              <Link href="/checking">Premier Checking</Link>
              <Link href="/savings">High-Yield Savings</Link>
              <Link href="/credit-cards">Elite Cards</Link>
              <Link href="/loans">Private Credit</Link>
            </div>

            <div className={styles.footerColumn}>
              <h4>Wealth Management</h4>
              <Link href="/wealth/advisory">Investment Advisory</Link>
              <Link href="/wealth/retirement">Retirement Planning</Link>
              <Link href="/wealth/trust">Trust Services</Link>
              <Link href="/wealth/private">Family Office</Link>
            </div>

            <div className={styles.footerColumn}>
              <h4>Company</h4>
              <Link href="/about">About Us</Link>
              <Link href="/careers">Careers</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/security">Security</Link>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerLinks}>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/security">Security</Link>
              <Link href="/disclosures">Disclosures</Link>
            </div>
            <div className={styles.footerCopy}>
              <p>© 2024 Aldwych European Capital. All rights reserved. Authorised and regulated by the Financial Conduct Authority.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}