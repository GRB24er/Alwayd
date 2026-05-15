"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./privacy.module.css";

export default function PrivacyPage() {
  return (
    <div className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/Logo.png" alt="Aldwych European Capital" width={160} height={40} priority />
          </Link>
          <div className={styles.navLinks}>
            <Link href="/support">Support</Link>
            <Link href="/auth/signin">Sign in</Link>
            <Link href="/apply" className={styles.navCta}>Apply</Link>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Legal · GDPR</span>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subtitle}>
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h2>1. Who We Are</h2>
            <p>
              <strong>Aldwych European Capital</strong> ("Aldwych", "we", "us", or "our") is the data
              controller for personal data collected through our lending platform and services. We are
              committed to protecting your personal data in accordance with the EU General Data
              Protection Regulation (GDPR) and applicable national data protection laws.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Information We Collect</h2>
            <p>We collect and process the following categories of personal data:</p>
            <ul>
              <li><strong>Identity data:</strong> name, date of birth, nationality, identification document details</li>
              <li><strong>Contact data:</strong> email address, telephone number, residential address</li>
              <li><strong>Financial data:</strong> income, employment, existing debt, business financials, bank statements</li>
              <li><strong>Application data:</strong> loan purpose, requested amount, documents uploaded</li>
              <li><strong>Technical data:</strong> IP address, browser type, device identifiers, session logs</li>
              <li><strong>Communication data:</strong> messages exchanged through our secure messaging platform</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Legal Basis for Processing</h2>
            <p>We process your data on the following legal bases:</p>
            <ul>
              <li><strong>Contract performance:</strong> processing your loan application and servicing your facility</li>
              <li><strong>Legal obligation:</strong> KYC and AML checks required by financial regulation</li>
              <li><strong>Legitimate interests:</strong> fraud prevention, risk management, platform security</li>
              <li><strong>Consent:</strong> for marketing communications, which you can withdraw at any time</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. How We Use Your Data</h2>
            <p>Your personal data is used to:</p>
            <ul>
              <li>Verify your identity and conduct KYC/AML checks</li>
              <li>Assess your creditworthiness and underwrite your application</li>
              <li>Administer your loan facility and process repayments</li>
              <li>Communicate with you regarding your application and account</li>
              <li>Comply with legal, regulatory, and tax reporting obligations</li>
              <li>Detect and prevent fraud, money laundering, and other unlawful activity</li>
              <li>Improve our services through aggregated analytics</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Data Sharing</h2>
            <p>We share your data only where necessary and with the following categories of recipients:</p>
            <ul>
              <li><strong>Credit reference agencies:</strong> for credit assessment and reporting</li>
              <li><strong>Fraud prevention agencies:</strong> for identity verification and fraud detection</li>
              <li><strong>Regulators and authorities:</strong> when required by law</li>
              <li><strong>Service providers:</strong> cloud hosting, secure document storage, payment processing</li>
              <li><strong>Professional advisors:</strong> auditors, lawyers, consultants under confidentiality</li>
            </ul>
            <p>
              <strong>We do not sell your personal data.</strong> We do not share your data with third
              parties for their own marketing purposes.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. International Transfers</h2>
            <p>
              Where personal data is transferred outside the European Economic Area, we ensure
              appropriate safeguards are in place, including Standard Contractual Clauses approved by
              the European Commission and, where required, supplementary measures.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Data Retention</h2>
            <p>
              We retain personal data for as long as necessary to fulfil the purposes for which it was
              collected, including:
            </p>
            <ul>
              <li>Application data: 7 years from the date of application or facility closure</li>
              <li>KYC documents: 5 years from the end of the business relationship (regulatory requirement)</li>
              <li>Financial records: 7 years (statutory retention)</li>
              <li>Marketing data: until you withdraw consent</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Your Rights Under GDPR</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Rectify</strong> inaccurate or incomplete data</li>
              <li><strong>Erase</strong> your data where legal requirements allow</li>
              <li><strong>Restrict</strong> processing in certain circumstances</li>
              <li><strong>Object</strong> to processing based on legitimate interests</li>
              <li><strong>Data portability</strong> for data you provided to us</li>
              <li><strong>Withdraw consent</strong> at any time for consent-based processing</li>
              <li><strong>Lodge a complaint</strong> with your national supervisory authority</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a>.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Security</h2>
            <p>
              We implement technical and organisational security measures to protect your data,
              including:
            </p>
            <ul>
              <li>TLS 1.3 encryption for all data in transit</li>
              <li>AES-256 encryption for data at rest</li>
              <li>Role-based access controls and audit logging</li>
              <li>Regular security testing and vulnerability management</li>
              <li>Staff training on data protection and confidentiality</li>
              <li>Multi-factor authentication for system access</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>10. Cookies</h2>
            <p>
              Our platform uses cookies and similar technologies to operate essential functions,
              remember your preferences, and analyse platform usage. Essential cookies are always
              active; optional cookies require your consent. You can manage cookie preferences
              through your browser settings at any time.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Automated Decision-Making</h2>
            <p>
              Some elements of our credit assessment may involve automated processing, including
              automated scoring. You have the right to request human review of any decision that
              significantly affects you. Final lending decisions are always reviewed by our
              underwriting team.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be notified
              to you by email or via prominent notice on the platform. Where required, we will
              obtain your fresh consent for new uses of your data.
            </p>
          </section>

          <section className={styles.section}>
            <h2>13. Contact Us</h2>
            <p>
              For any privacy-related queries or to exercise your rights, please contact our Data
              Protection team at{" "}
              <a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a>
              {" "}or via our <Link href="/support">Support Centre</Link>.
            </p>
          </section>
        </div>

        <div className={styles.relatedLinks}>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/support">Support Centre</Link>
          <Link href="/">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
