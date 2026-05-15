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
              <Link href="/support">Support</Link>
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
              <p className={styles.footerTagline}>European Private Banking Excellence since 1897.</p>
              <div className={styles.footerCompliance}>
                <span>SSL Secured</span>
                <span>GDPR</span>
                <span>AML/KYC</span>
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
              <Link href="/support">Support Centre</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Legal & Compliance</h5>
              <Link href="/terms">Terms & Conditions</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/support">Contact Support</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <div>© {new Date().getFullYear()} Aldwych European Capital. All rights reserved.</div>
            <div className={styles.footerBottomRight}>
              Your capital is at risk if you fail to meet repayment obligations.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
