// src/app/help/page.tsx — Aldwych European Capital Help Centre
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./help.module.css";

const TOPICS = [
  {
    title: "Accounts & Balances",
    desc: "Opening accounts, viewing balances, understanding your account details and interest.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" /><path d="M3 21h18" /><path d="M12 7v4" /><path d="M10 9h4" /></svg>
    ),
  },
  {
    title: "Transfers & Payments",
    desc: "Internal transfers, wires, international payments, cut-off times and limits.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
    ),
  },
  {
    title: "Cards",
    desc: "Debit and credit cards, activation, PIN management, and reporting a lost card.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
    ),
  },
  {
    title: "Security & Fraud",
    desc: "Protecting your account, verification codes, and what to do if you spot fraud.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
  },
  {
    title: "Statements & Documents",
    desc: "Downloading monthly statements, transaction receipts, and tax documents.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    ),
  },
  {
    title: "Loans & Credit",
    desc: "Loan applications, repayment schedules, early settlement and tracking status.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    ),
  },
];

const FAQS = [
  {
    q: "How do I reset my password?",
    a: (
      <>
        On the sign-in page, select <strong>Recover Access</strong>. Enter your account
        email and we&apos;ll send you a 6-digit verification code — enter it along with
        your new password. If you&apos;re signed in, you can also change your password
        from <Link href="/security">Security Settings</Link>.
      </>
    ),
  },
  {
    q: "How long do transfers take?",
    a: (
      <>
        Internal transfers between your own accounts are instant. Domestic wires
        typically settle the same business day when submitted before the 3:00 PM cut-off.
        International (SWIFT) transfers usually take 1–3 business days depending on the
        destination bank and correspondent network.
      </>
    ),
  },
  {
    q: "How do I download my account statement?",
    a: (
      <>
        Go to <Link href="/accounts/statements">Accounts → Statements</Link>, choose the
        account and statement period, and select Download. Statements are generated as
        PDF documents with full transaction detail.
      </>
    ),
  },
  {
    q: "Why was I asked for a verification code when signing in?",
    a: (
      <>
        As a standard security measure, we send a one-time verification code to your
        registered email to confirm it&apos;s really you. Codes expire after 10 minutes.
        If you don&apos;t receive one, check your spam folder or use the resend option.
      </>
    ),
  },
  {
    q: "What should I do if I suspect fraud on my account?",
    a: (
      <>
        Contact us immediately on <strong>+44 (0)20 7946 0000</strong> (24/7) and we&apos;ll
        secure your account. You should also change your password from{" "}
        <Link href="/security">Security Settings</Link>. We will never ask you for your
        full password or a verification code by phone or email.
      </>
    ),
  },
  {
    q: "How do I apply for a loan?",
    a: (
      <>
        Start an application at <Link href="/apply">Apply for a Loan</Link>. Most
        decisions are made within 48 hours, and you can track progress at{" "}
        <Link href="/loans/track">Loans → Track Application</Link>.
      </>
    ),
  },
  {
    q: "Are my deposits protected?",
    a: (
      <>
        Aldwych European Capital is authorised by the Prudential Regulation Authority
        and regulated by the Financial Conduct Authority and the Prudential Regulation
        Authority. Eligible deposits are protected up to the applicable statutory limit.
      </>
    ),
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
          <span className={styles.eyebrow}>Help Centre</span>
          <h1 className={styles.title}>How can we help?</h1>
          <p className={styles.subtitle}>
            Find answers to common questions about your accounts, transfers, cards and
            security — or get in touch with our team directly.
          </p>
        </div>

        {/* Topics */}
        <div className={styles.topics}>
          {TOPICS.map((t) => (
            <div key={t.title} className={styles.topicCard}>
              <div className={styles.topicIcon}>{t.icon}</div>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <h2 className={styles.sectionHeading}>Frequently asked questions</h2>
          <p className={styles.sectionSub}>
            Quick answers to the questions we hear most often.
          </p>
          <div className={styles.faqList}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} className={styles.faqItem} data-open={openFaq === i}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {faq.q}
                  <svg className={styles.faqChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {openFaq === i && <div className={styles.faqAnswer}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Contact strip */}
        <div className={styles.contactStrip}>
          <div className={styles.contactItem}>
            <div className={styles.contactIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </div>
            <div>
              <h4>Call us 24/7</h4>
              <p><a href="tel:+442079460000">+44 (0)20 7946 0000</a></p>
            </div>
          </div>

          <div className={styles.contactItem}>
            <div className={styles.contactIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <div>
              <h4>Email support</h4>
              <p><a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a></p>
            </div>
          </div>

          <div className={styles.contactItem}>
            <div className={styles.contactIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            </div>
            <div>
              <h4>Support Centre</h4>
              <p>
                Signed-in clients can raise a secure request from the{" "}
                <Link href="/support">Support Centre</Link>.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.relatedLinks}>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
