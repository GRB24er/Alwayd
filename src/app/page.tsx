"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

const LOAN_CATEGORIES = [
  {
    key: "business",
    title: "Business Loans",
    range: "€50K – €5M",
    rate: "From 4.9% APR",
    desc: "Working capital, expansion finance, and growth funding for established businesses.",
    features: ["Up to 84-month terms", "Funds in 48 hours", "No early repayment fees"],
  },
  {
    key: "contractor",
    title: "Contractor Financing",
    range: "€25K – €2M",
    rate: "From 5.4% APR",
    desc: "Bridge cash-flow gaps between invoicing and payment for contractors and consultants.",
    features: ["Flexible drawdowns", "Invoice-backed lending", "Project-based terms"],
  },
  {
    key: "sme",
    title: "SME Expansion Loans",
    range: "€30K – €3M",
    rate: "From 5.1% APR",
    desc: "Tailored facilities for small and medium enterprises scaling across Europe.",
    features: ["Multi-currency facilities", "Dedicated relationship manager", "Custom repayment schedule"],
  },
  {
    key: "trade",
    title: "Trade Finance",
    range: "€100K – €10M",
    rate: "From 3.8% APR",
    desc: "Letters of credit, documentary collections, and import/export facilities for global trade.",
    features: ["LCs & guarantees", "Cross-border settlement", "Trade insurance included"],
  },
  {
    key: "equipment",
    title: "Equipment Financing",
    range: "€10K – €1.5M",
    rate: "From 4.5% APR",
    desc: "Acquire machinery, vehicles, and capital equipment with asset-backed terms.",
    features: ["Up to 100% financing", "Fixed monthly payments", "Equipment as collateral"],
  },
  {
    key: "personal",
    title: "Personal Loans",
    range: "€5K – €250K",
    rate: "From 6.9% APR",
    desc: "Unsecured personal lending for major purchases, consolidation, or life events.",
    features: ["No collateral required", "Fast approval", "Transparent pricing"],
  },
];

const STATS = [
  { value: "€2.4B+", label: "Approved Loans" },
  { value: "42", label: "Countries Served" },
  { value: "98.7%", label: "Customer Satisfaction" },
  { value: "€8.6B+", label: "Funding Volume" },
];

const TESTIMONIALS = [
  {
    name: "Marcus Hoffmann",
    role: "CEO",
    company: "Hoffmann Logistics GmbH",
    rating: 5,
    text: "Aldwych delivered our €1.2M working capital facility within 72 hours. Their team understood our seasonal cash flow needs immediately. The terms were transparent, the rate competitive, and our dedicated relationship manager has been outstanding.",
  },
  {
    name: "Élise Marchetti",
    role: "Founder",
    company: "Marchetti & Associés",
    rating: 5,
    text: "After being declined by two major banks, Aldwych funded our office expansion with a €450K SME loan. Their underwriting team genuinely engaged with our business plan rather than relying on automated scoring. A truly relationship-driven lender.",
  },
  {
    name: "James Ó Briain",
    role: "Managing Director",
    company: "BriainBuild Construction",
    rating: 5,
    text: "Contractor financing through Aldwych has transformed how we manage project cash flow. The drawdown facility lets us bid on larger contracts with confidence. Fast, professional, and refreshingly transparent on pricing.",
  },
];

const FAQS = [
  {
    q: "How long does the loan application take?",
    a: "Most applications receive an underwriting decision within 24–48 business hours. Once approved and the agreement is signed, funds are typically disbursed within 1 business day. Trade finance facilities may take 3–5 business days due to additional documentation requirements.",
  },
  {
    q: "What documents will I need?",
    a: "At minimum: a government-issued ID and proof of address (within 3 months). For business loans, we typically require last 6 months of bank statements, last 2 years of financial accounts, and a brief description of the loan purpose. We will guide you through the requirements during the application.",
  },
  {
    q: "Will applying affect my credit score?",
    a: "Our initial eligibility check is a soft inquiry and will not affect your credit score. A full credit assessment is only performed once you accept a formal loan offer, at which point a hard inquiry is recorded.",
  },
  {
    q: "Are there fees or hidden charges?",
    a: "No. We operate on a transparent fee model. The interest rate quoted in your offer is the rate you pay. There are no arrangement fees, no early repayment penalties, and no hidden charges. The Representative APR includes all costs of borrowing.",
  },
  {
    q: "Who is eligible to apply?",
    a: "Personal loans are available to EU/UK residents aged 21+ with a verifiable income. Business loans require a registered business with at least 12 months of trading history. We lend across 42 countries — please check eligibility during your application.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are fully GDPR compliant and operate under European banking secrecy standards. We never sell or share your data with third parties for marketing purposes.",
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={styles.landingPage}>
      {/* TOP NAV */}
      <header className={`${styles.topNav} ${scrolled ? styles.topNavScrolled : ""}`}>
        <div className={styles.container}>
          <div className={styles.topNavInner}>
            <Link href="/" className={styles.brandLink}>
              <Image
                src="/images/Logo.png"
                alt="Aldwych European Capital"
                width={180}
                height={44}
                priority
                className={styles.brandLogo}
              />
            </Link>
            <nav className={styles.navLinks}>
              <a href="#products">Lending</a>
              <a href="#how-it-works">How it works</a>
              <a href="#testimonials">Clients</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">Contact</a>
            </nav>
            <div className={styles.navActions}>
              <Link href="/auth/signin" className={styles.navSignIn}>Sign in</Link>
              <Link href="/apply" className={styles.navCta}>Apply for a Loan</Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>European Private Banking · Since 1897</span>
              <h1 className={styles.heroTitle}>
                Business & Personal Financing<br />
                <span className={styles.heroTitleAccent}>Built for Growth</span>
              </h1>
              <p className={styles.heroDesc}>
                From €5,000 personal facilities to €10M trade finance lines — Aldwych European Capital
                provides relationship-driven lending with transparent pricing, 48-hour decisions, and
                dedicated relationship managers for every client.
              </p>
              <div className={styles.heroActions}>
                <Link href="/apply" className={styles.heroCtaPrimary}>
                  Apply for a Loan
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
                <a href="#products" className={styles.heroCtaSecondary}>Explore Lending Products</a>
              </div>
              <div className={styles.heroTrust}>
                <div className={styles.heroTrustItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  SSL Secured
                </div>
                <div className={styles.heroTrustItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  GDPR Compliant
                </div>
                <div className={styles.heroTrustItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
                  KYC Verified
                </div>
              </div>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.heroCard}>
                <div className={styles.heroCardHeader}>
                  <div>
                    <div className={styles.heroCardTitle}>Representative example</div>
                    <div className={styles.heroCardSubtitle}>Business loan facility</div>
                  </div>
                  <div className={styles.heroCardBadge}>4.9% APR</div>
                </div>
                <div className={styles.heroCardBody}>
                  <div className={styles.heroCardRow}>
                    <span>Loan amount</span><strong>€250,000</strong>
                  </div>
                  <div className={styles.heroCardRow}>
                    <span>Term</span><strong>60 months</strong>
                  </div>
                  <div className={styles.heroCardRow}>
                    <span>Monthly payment</span><strong>€4,706</strong>
                  </div>
                  <div className={styles.heroCardRowMain}>
                    <span>Total repayable</span><strong>€282,330</strong>
                  </div>
                </div>
                <div className={styles.heroCardFoot}>
                  Indicative rate. Your final offer is based on credit assessment and application profile.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Lending Products</span>
            <h2 className={styles.sectionTitle}>A facility for every stage of growth</h2>
            <p className={styles.sectionDesc}>
              From your first €5K personal loan to multi-million-euro trade finance, every Aldwych
              facility is structured around your business and underwritten by experienced relationship managers.
            </p>
          </div>

          <div className={styles.productsGrid}>
            {LOAN_CATEGORIES.map((p) => (
              <div key={p.key} className={styles.productCard}>
                <div className={styles.productHeader}>
                  <div>
                    <h3 className={styles.productTitle}>{p.title}</h3>
                    <div className={styles.productRange}>{p.range}</div>
                  </div>
                  <div className={styles.productRate}>{p.rate}</div>
                </div>
                <p className={styles.productDesc}>{p.desc}</p>
                <ul className={styles.productFeatures}>
                  {p.features.map((f) => (
                    <li key={f}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2.5" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/apply" className={styles.productCta}>
                  Apply now
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>From application to funded — in under a week</h2>
          </div>

          <div className={styles.stepsGrid}>
            {[
              { num: "01", title: "Apply Online", desc: "Complete our secure 8-step application in under 15 minutes. KYC verification is built in." },
              { num: "02", title: "Underwriting Review", desc: "Our team reviews your application within 24–48 business hours. You can message us at any time." },
              { num: "03", title: "Receive Offer", desc: "Approved offers include full terms, monthly payments, and total repayable. Valid for 14 days." },
              { num: "04", title: "Sign & Disburse", desc: "Digital signature on your agreement. Funds disbursed to your account within 1 business day." },
            ].map((step) => (
              <div key={step.num} className={styles.stepCard}>
                <div className={styles.stepNum}>{step.num}</div>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Client Stories</span>
            <h2 className={styles.sectionTitle}>Trusted by businesses across Europe</h2>
          </div>

          <div className={styles.testimonialsGrid}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className={styles.testimonialCard}>
                <div className={styles.testimonialStars}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" fill="#c9a962" stroke="#c9a962" style={{ width: 16, height: 16 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  ))}
                </div>
                <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.name.charAt(0)}</div>
                  <div>
                    <div className={styles.testimonialName}>{t.name}</div>
                    <div className={styles.testimonialRole}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div className={styles.trustCard}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: 32, height: 32 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              <h4>SSL Secured</h4>
              <p>TLS 1.3 encryption across every connection. Your data is protected end-to-end.</p>
            </div>
            <div className={styles.trustCard}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: 32, height: 32 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
              <h4>KYC Verified</h4>
              <p>AML and KYC compliant under European banking secrecy standards.</p>
            </div>
            <div className={styles.trustCard}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: 32, height: 32 }}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              <h4>Encrypted Banking</h4>
              <p>AES-256 encryption at rest. Bank-grade infrastructure across all data centers.</p>
            </div>
            <div className={styles.trustCard}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: 32, height: 32 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              <h4>Compliance Standards</h4>
              <p>Full GDPR compliance. Audited under European financial regulation frameworks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>FAQ</span>
            <h2 className={styles.sectionTitle}>Answers to common questions</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map((f, i) => (
              <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ""}`}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {openFaq === i && <div className={styles.faqAnswer}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Contact Us</span>
            <h2 className={styles.sectionTitle}>Speak to a relationship manager</h2>
            <p className={styles.sectionDesc}>
              Our private banking team is available across London, Dublin, and Frankfurt. Reach out and we will
              respond within one business hour.
            </p>
          </div>

          <div className={styles.contactGrid}>
            <a className={styles.contactCard} href="tel:+442039178200">
              <div className={styles.contactIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 24, height: 24 }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className={styles.contactLabel}>Call Us</div>
              <div className={styles.contactValue}>+44 20 3917 8200</div>
              <div className={styles.contactSub}>Mon–Fri · 08:00–18:00 GMT</div>
            </a>

            <a className={styles.contactCard} href="mailto:lending@aldwycheuropeancapital.com">
              <div className={styles.contactIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 24, height: 24 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className={styles.contactLabel}>Email Lending Team</div>
              <div className={styles.contactValue}>lending@aldwycheuropeancapital.com</div>
              <div className={styles.contactSub}>Reply within 1 business hour</div>
            </a>

            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 24, height: 24 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className={styles.contactLabel}>Head Office</div>
              <div className={styles.contactValue}>85 Aldwych, London WC2B 4HP</div>
              <div className={styles.contactSub}>United Kingdom</div>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 24, height: 24 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className={styles.contactLabel}>European Offices</div>
              <div className={styles.contactValue}>Dublin · Frankfurt · Luxembourg</div>
              <div className={styles.contactSub}>+353 1 437 0234 · +49 69 9999 4120</div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.finalCtaInner}>
            <h2 className={styles.finalCtaTitle}>Ready to grow with Aldwych?</h2>
            <p className={styles.finalCtaDesc}>
              Apply online in under 15 minutes. No commitment — see your indicative offer before signing anything.
            </p>
            <Link href="/apply" className={styles.heroCtaPrimary}>
              Begin Your Application
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Image src="/images/Logo.png" alt="Aldwych European Capital" width={170} height={42} className={styles.footerLogo} />
              <p className={styles.footerTagline}>
                European Private Banking Excellence since 1897. Authorized lending for businesses and
                individuals across 42 countries.
              </p>
              <div className={styles.footerSocial}>
                <a href="https://www.linkedin.com/company/aldwycheuropeancapital" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
                  </svg>
                </a>
                <a href="https://twitter.com/AldwychCapital" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                </a>
                <a href="https://www.facebook.com/AldwychEuropeanCapital" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.927-1.956 1.879v2.255h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/aldwycheuropeancapital" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
                <a href="https://www.youtube.com/@aldwycheuropeancapital" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className={styles.footerCol}>
              <h5>Lending</h5>
              <a href="#products">Business Loans</a>
              <a href="#products">Contractor Financing</a>
              <a href="#products">SME Expansion</a>
              <a href="#products">Trade Finance</a>
              <a href="#products">Equipment Financing</a>
              <a href="#products">Personal Loans</a>
            </div>
            <div className={styles.footerCol}>
              <h5>Company</h5>
              <a href="#how-it-works">How it works</a>
              <a href="#testimonials">Clients</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">Contact</a>
              <Link href="/support">Support Centre</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Get in Touch</h5>
              <div className={styles.footerContactItem}>
                <strong>Head Office</strong>
                <span>85 Aldwych, London WC2B 4HP<br />United Kingdom</span>
              </div>
              <div className={styles.footerContactItem}>
                <strong>Phone</strong>
                <a href="tel:+442039178200">+44 20 3917 8200</a>
              </div>
              <div className={styles.footerContactItem}>
                <strong>Email</strong>
                <a href="mailto:info@aldwycheuropeancapital.com">info@aldwycheuropeancapital.com</a>
              </div>
            </div>
          </div>

          <div className={styles.footerLegal}>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy">Privacy Policy</Link>
            <span>·</span>
            <Link href="/support">Cookie Policy</Link>
            <span>·</span>
            <a href="mailto:compliance@aldwycheuropeancapital.com">Compliance</a>
          </div>

          <div className={styles.footerBottom}>
            <div>© {new Date().getFullYear()} Aldwych European Capital. All rights reserved.</div>
            <div className={styles.footerBottomRight}>
              Authorised and regulated. Your capital is at risk if you fail to meet repayment obligations.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
