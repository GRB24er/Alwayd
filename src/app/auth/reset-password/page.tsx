'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './reset.module.css';

const Icons = {
  mail: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  lock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  key: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
  eye: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeOff: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><polyline points="20 6 9 17 4 12"/></svg>),
  alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
  checkCircle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'48px',height:'48px'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
};

const RULES = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw: string) => /\d/.test(pw) },
];

type Step = 'email' | 'verify' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const rulesPass = RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const codeValid = code.trim().length === 6;

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!emailValid || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to send the code. Please try again.');
        return;
      }
      setInfo('If an account exists for this email, a 6-digit verification code has been sent. It expires in 10 minutes.');
      setStep('verify');
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e?: React.FormEvent) {
    e?.preventDefault();
    if (!codeValid || !rulesPass || !matches || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to reset your password. Please try again.');
        return;
      }
      setStep('done');
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Logo.png" alt="Aldwych European Capital" className={styles.logo} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {step === 'done' ? (
          <div className={styles.successPanel}>
            <div className={styles.successIcon}>{Icons.checkCircle}</div>
            <h1 className={styles.heading}>Password Reset</h1>
            <p className={styles.subtitle}>
              Your password has been reset successfully. Sign in with your new password to continue.
            </p>
            <button type="button" className={styles.submitButton} onClick={() => router.push('/auth/signin')}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className={styles.headerSection}>
              <h1 className={styles.heading}>Recover Access</h1>
              <p className={styles.subtitle}>
                {step === 'email'
                  ? "Enter your account email and we'll send you a verification code."
                  : 'Enter the 6-digit code we emailed you and choose a new password.'}
              </p>
            </div>

            {info && step === 'verify' && (
              <div className={`${styles.message} ${styles.successMessage}`}>
                <span className={styles.messageIcon}>{Icons.check}</span>
                <span>{info}</span>
              </div>
            )}
            {error && (
              <div className={`${styles.message} ${styles.errorMessage}`}>
                <span className={styles.messageIcon}>{Icons.alert}</span>
                <span>{error}</span>
              </div>
            )}

            {step === 'email' ? (
              <form className={styles.form} onSubmit={requestCode}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="email">Account Email</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>{Icons.mail}</span>
                    <input
                      id="email"
                      type="email"
                      className={styles.input}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      autoComplete="email"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitButton} disabled={!emailValid || loading}>
                  {loading ? 'Sending…' : 'Send Verification Code'}
                </button>

                <button type="button" className={styles.linkButton} onClick={() => router.push('/auth/signin')} disabled={loading}>
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={submitReset}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="code">Verification Code</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>{Icons.key}</span>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${styles.codeInput}`}
                      placeholder="6-digit code"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
                      maxLength={6}
                      disabled={loading}
                      required
                    />
                  </div>
                  <button type="button" className={styles.resendButton} onClick={() => requestCode()} disabled={loading}>
                    Didn&apos;t receive it? Resend code
                  </button>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="newPassword">New Password</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>{Icons.lock}</span>
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      autoComplete="new-password"
                      disabled={loading}
                      required
                    />
                    <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? Icons.eyeOff : Icons.eye}
                    </button>
                  </div>
                  <ul className={styles.ruleList}>
                    {RULES.map((rule) => (
                      <li key={rule.label} className={rule.test(newPassword) ? styles.rulePass : styles.rule}>
                        {Icons.check}
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>{Icons.lock}</span>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      autoComplete="new-password"
                      disabled={loading}
                      required
                    />
                  </div>
                  {confirmPassword.length > 0 && !matches && (
                    <p className={styles.mismatch}>Passwords do not match</p>
                  )}
                </div>

                <button type="submit" className={styles.submitButton} disabled={!codeValid || !rulesPass || !matches || loading}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>

                <button type="button" className={styles.linkButton} onClick={() => setStep('email')} disabled={loading}>
                  Use a different email
                </button>
              </form>
            )}
          </>
        )}

        <div className={styles.securityNote}>
          {Icons.shield}
          <span>Secured with 256-bit encryption · Aldwych European Capital</span>
        </div>
      </div>
    </div>
  );
}
