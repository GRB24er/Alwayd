// src/app/auth/verify/page.tsx — sign-in second factor
// After password sign-in, a 6-digit code is emailed to the account holder.
// Protected pages stay locked (middleware) until the code is verified here.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './verify.module.css';

const RESEND_COOLDOWN = 60; // seconds

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

export default function VerifySignInPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const sentOnce = useRef(false);

  const email = session?.user?.email || '';

  const sendCode = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to send the verification code. Please try again.');
        return;
      }
      setInfo('A 6-digit verification code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }, [sending]);

  // Redirect rules + initial code send.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      return;
    }
    if (status === 'authenticated') {
      if (session?.user?.otpVerified) {
        router.replace('/dashboard');
        return;
      }
      if (!sentOnce.current) {
        sentOnce.current = true;
        sendCode();
      }
    }
  }, [status, session, router, sendCode]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.trim().length !== 6 || verifying) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.proof) {
        setError(data.error || 'Invalid or expired verification code.');
        setCode('');
        return;
      }
      // Hand the signed proof to NextAuth; the jwt callback verifies it and
      // marks this session as second-factor complete.
      await update({ otpProof: data.proof });
      router.replace('/dashboard');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingScreen}>
            <div className={styles.spinner} />
            <span>Preparing secure verification…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Logo.png"
            alt="Aldwych European Capital"
            className={styles.logo}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <div className={styles.shieldIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>

        <h1 className={styles.heading}>Verify it&apos;s you</h1>
        <p className={styles.subtitle}>
          For your security, we&apos;ve sent a 6-digit verification code to{' '}
          <strong>{email ? maskEmail(email) : 'your registered email'}</strong>.
          Enter it below to access your account.
        </p>

        {info && !error && (
          <div className={`${styles.message} ${styles.successMessage}`}>
            <span className={styles.messageIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span>{info}</span>
          </div>
        )}
        {error && (
          <div className={`${styles.message} ${styles.errorMessage}`}>
            <span className={styles.messageIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleVerify}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={styles.codeInput}
            placeholder="000000"
            value={code}
            maxLength={6}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
              setError('');
            }}
            disabled={verifying}
            autoFocus
            required
          />
          <p className={styles.expiryNote}>The code expires 10 minutes after it was sent.</p>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={code.length !== 6 || verifying}
          >
            {verifying ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <div className={styles.resendRow}>
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              className={styles.resendButton}
              onClick={sendCode}
              disabled={sending || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </form>

        <div className={styles.signOutRow}>
          Not you?{' '}
          <button
            type="button"
            className={styles.signOutButton}
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            Sign out
          </button>
        </div>

        <div className={styles.securityNote}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span>We will never ask you for this code by phone or email.</span>
        </div>
      </div>
    </div>
  );
}
