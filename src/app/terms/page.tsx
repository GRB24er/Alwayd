"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./terms.module.css";

export default function TermsPage() {
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
          <span className={styles.eyebrow}>Legal</span>
          <h1 className={styles.title}>Terms &amp; Conditions</h1>
          <p className={styles.subtitle}>
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h2>1. Introduction</h2>
            <p>
              These Terms and Conditions ("Terms") govern your use of the lending services and digital
              platform operated by <strong>Aldwych European Capital</strong> ("Aldwych", "we", "us", or
              "our"). By accessing our platform or applying for any lending facility, you agree to be
              bound by these Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Eligibility</h2>
            <p>To apply for a loan, you must:</p>
            <ul>
              <li>Be at least 21 years of age (18 for personal banking only)</li>
              <li>Be a resident of one of our supported jurisdictions</li>
              <li>Hold a valid government-issued identification document</li>
              <li>Provide accurate and complete information during application</li>
              <li>Pass our identity verification (KYC) and anti-money-laundering (AML) checks</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Loan Applications</h2>
            <p>
              All loan applications are subject to credit assessment and underwriting review.
              Submission of an application does not guarantee approval. Aldwych reserves the right to
              decline any application without providing reasons, in accordance with applicable law.
            </p>
            <p>
              Loan offers are valid for 14 days from the date of issuance unless otherwise stated.
              Offers lapse automatically if not accepted within this period.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Interest Rates &amp; Fees</h2>
            <p>
              The interest rate (APR) shown on the landing page is a representative rate. Your final
              rate is determined during underwriting based on your application profile and credit
              assessment. The agreed rate is fixed for the duration of your facility unless
              otherwise stated in your loan agreement.
            </p>
            <p>
              <strong>No arrangement fees. No early repayment penalties.</strong> The interest rate
              disclosed in your offer represents the full cost of borrowing.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Repayment Obligations</h2>
            <p>
              You agree to make scheduled repayments in accordance with your loan agreement. Failure to
              make repayments may result in:
            </p>
            <ul>
              <li>Late payment charges as set out in your agreement</li>
              <li>Reporting to credit reference agencies, which may affect your credit score</li>
              <li>Legal recovery action and associated costs</li>
              <li>Acceleration of the outstanding balance</li>
            </ul>
            <p>
              <strong>Your capital is at risk if you fail to meet repayment obligations.</strong>
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Use of Funds</h2>
            <p>
              Funds disbursed under any Aldwych facility must be used solely for the purpose declared
              in your application. Any material change in use requires our prior written consent.
              Funds may not be used for illegal activities, gambling, or speculative trading.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to notify us immediately of any unauthorized access. Aldwych is not liable
              for losses arising from your failure to maintain reasonable security of your credentials.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Data Protection</h2>
            <p>
              We process personal data in accordance with our <Link href="/privacy">Privacy Policy</Link>
              {" "}and applicable GDPR requirements. By submitting an application, you consent to the
              processing of your personal and financial data for the purpose of credit assessment,
              KYC verification, and ongoing administration of your facility.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Communications</h2>
            <p>
              By creating an account, you consent to electronic communications regarding your
              application, loan status, agreement documents, and statements. Secure messaging
              through our platform is the preferred channel for communications relating to your
              facility.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Aldwych shall not be liable for any
              indirect, incidental, special, or consequential damages arising from the use of our
              platform or services. Our maximum aggregate liability is limited to the amount of fees
              paid by you in the 12 months preceding the event giving rise to the claim.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes arising in
              connection with these Terms or your loan agreement shall be subject to the exclusive
              jurisdiction of the courts of England and Wales, save where applicable consumer law
              requires otherwise.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Changes to These Terms</h2>
            <p>
              We may amend these Terms from time to time. Material changes will be notified to you
              by email or by posting on our platform. Your continued use of our services following
              such notification constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>13. Contact</h2>
            <p>
              For questions regarding these Terms, contact our team at{" "}
              <a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a>{" "}
              or via our <Link href="/support">Support Centre</Link>.
            </p>
          </section>
        </div>

        <div className={styles.relatedLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/support">Support Centre</Link>
          <Link href="/">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
