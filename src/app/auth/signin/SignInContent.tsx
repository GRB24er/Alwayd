// app/(auth)/signin/page.tsx - BIG PROMINENT LOGO
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './signin.module.css';

// SVG Icons
const Icons = {
  mail: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  lock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  eye: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeOff: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>),
  arrow: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><polyline points="20 6 9 17 4 12"/></svg>),
  alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
  lockClosed: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  keyboard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h12"/></svg>),
  building: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px'}}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>),
  globe: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px'}}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  chart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px'}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  zap: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px'}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  secure: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>),
  monitor: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>),
  key: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
  x: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
};

export default function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const MAX_ATTEMPTS = 3;
  const LOCKOUT_SECONDS = 60;
  const REMEMBER_DAYS = 30;

  const registeredParam = searchParams?.get('registered') ?? '';
  const isRegistrationSuccess = useMemo(() => {
    const v = registeredParam.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'success' || v === 'ok';
  }, [registeredParam]);

  const initialMessage = isRegistrationSuccess ? 'Account created successfully! Please sign in below.' : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>(initialMessage);
  const [loading, setLoading] = useState<boolean>(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showSecurityTip, setShowSecurityTip] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aldwych_signin_remember');
      const rawEmail = localStorage.getItem('aldwych_signin_email');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.enabled && parsed?.expiresAt && parsed.expiresAt > Date.now()) {
        setRememberMe(true);
        if (rawEmail) setEmail(rawEmail);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!rememberMe) {
        localStorage.removeItem('aldwych_signin_remember');
        localStorage.removeItem('aldwych_signin_email');
        return;
      }
      const expiresAt = Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem('aldwych_signin_remember', JSON.stringify({ enabled: true, expiresAt }));
      if (email.trim()) localStorage.setItem('aldwych_signin_email', email.trim().toLowerCase());
    } catch {}
  }, [rememberMe, email]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (lockoutTime > 0) {
      timer = setTimeout(() => setLockoutTime((t) => t - 1), 1000);
    } else if (isLocked && lockoutTime === 0) {
      setIsLocked(false);
      setAttempts(0);
      setErrorMsg('');
    }
    return () => clearTimeout(timer);
  }, [lockoutTime, isLocked]);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Second factor first: until the emailed code is verified, the
      // middleware keeps every account page locked.
      const destination = session.user?.otpVerified ? '/dashboard' : '/auth/verify';
      const timer = setTimeout(() => router.replace(destination), 500);
      return () => clearTimeout(timer);
    }
  }, [status, session, router]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSecurityTip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showSecurityTip) {
      const timer = setTimeout(() => setShowSecurityTip(false), 12000);
      return () => clearTimeout(timer);
    }
  }, [showSecurityTip]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLocked) { setErrorMsg(`Account temporarily locked. Please wait ${lockoutTime}s.`); return; }
    if (!email.trim() || !password.trim()) { setErrorMsg('Please enter both email and password.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const res = await signIn('credentials', { redirect: false, email: email.trim().toLowerCase(), password: password.trim() });
      if (res?.error) {
        setAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            setIsLocked(true);
            setLockoutTime(LOCKOUT_SECONDS);
            setErrorMsg(`Security lockout activated. Account locked for ${LOCKOUT_SECONDS} seconds.`);
          } else {
            setErrorMsg(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
          }
          if (newAttempts < MAX_ATTEMPTS) setTimeout(() => passwordRef.current?.select(), 100);
          return newAttempts;
        });
        return;
      }
      if (res?.ok) { setAttempts(0); setErrorMsg(''); setTimeout(() => router.replace('/auth/verify'), 500); }
      else { setErrorMsg('Authentication service unavailable. Please try again.'); }
    } catch (error) { console.error('Sign-in error:', error); setErrorMsg('Network error. Please check your connection.'); }
    finally { setLoading(false); }
  };

  const handlePasswordKeyState = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  }, []);

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.redirectContainer}>
          <div className={styles.redirectSpinner} />
          <h2 className={styles.redirectTitle}>Initializing Secure Session</h2>
          <p className={styles.redirectText}>Establishing encrypted connection...</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.redirectContainer}>
          <div className={styles.redirectSpinner} />
          <h2 className={styles.redirectTitle}>Credentials Accepted</h2>
          <p className={styles.redirectText}>Continuing to security verification...</p>
        </div>
      </div>
    );
  }

  const lockoutDisplay = lockoutTime > 0 ? ` (${lockoutTime}s)` : '';

  return (
    <>
      <div className={styles.container}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          <div className={styles.formWrapper}>
            
            {/* BIG LOGO - LIKE FEDEX STYLE */}
            <div className={styles.logoContainer}>
              <img
                src="/images/Logo.png"
                alt="Aldwych European Capital"
                className={styles.logo}
              />
            </div>

            <div className={styles.headerSection}>
              <h1 className={styles.heading}>Secure Access Portal</h1>
              <p className={styles.subtitle}>Enter your credentials to access your private banking suite</p>
            </div>

            {errorMsg && (
              <div className={`${styles.message} ${isRegistrationSuccess ? styles.successMessage : isLocked ? styles.errorMessage : attempts >= 2 ? styles.errorMessage : styles.warningMessage}`} role="alert">
                <span className={styles.messageIcon}>{isRegistrationSuccess ? Icons.check : isLocked ? Icons.lockClosed : Icons.alert}</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>{Icons.mail}</span>
                  <input ref={emailRef} id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={isLocked || loading} value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} placeholder="Enter your email" />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>{Icons.lock}</span>
                  <input ref={passwordRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={isLocked || loading} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handlePasswordKeyState} onKeyUp={handlePasswordKeyState} className={styles.input} placeholder="Enter your password" />
                  <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)} disabled={isLocked || loading} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? Icons.eyeOff : Icons.eye}</button>
                </div>
                {capsLockOn && !loading && !isLocked && (<div className={styles.capsLockWarning} role="status"><span className={styles.capsLockIcon}>{Icons.keyboard}</span>Caps Lock is enabled</div>)}
              </div>

              <div className={styles.optionsContainer}>
                <label className={styles.checkboxLabel} htmlFor="remember">
                  <input id="remember" name="remember" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className={styles.checkbox} disabled={isLocked || loading} />
                  <span className={styles.checkboxText}>Remember this device (30 days)</span>
                </label>
                <button type="button" onClick={() => router.push('/auth/reset-password')} className={styles.forgotPassword} disabled={loading}>Recover Access</button>
              </div>

              <button type="submit" disabled={loading || isLocked} className={`${styles.submitButton} ${isLocked ? styles.lockedButton : ''}`}>
                {loading ? (<><span className={styles.loadingSpinner} /><span className={styles.buttonText}>Verifying...</span></>) : isLocked ? (<><span className={styles.lockIcon}>{Icons.lockClosed}</span><span className={styles.buttonText}>Locked{lockoutDisplay}</span></>) : (<><span className={styles.buttonIcon}>{Icons.arrow}</span><span className={styles.buttonText}>Enter Secure Portal</span></>)}
              </button>
            </form>

            <div className={styles.divider}><span className={styles.dividerText}>or</span></div>

            <div className={styles.alternativeAction}>
              <p className={styles.alternativeText}>New to Aldwych European Capital?</p>
              <button type="button" onClick={() => router.push('/auth/signup')} className={styles.createAccountButton} disabled={loading}>Apply for Private Access</button>
            </div>

            <div className={styles.securityBadges}>
              <div className={styles.badge}><span className={styles.badgeIcon}>{Icons.secure}</span><span className={styles.badgeText}>256-bit Encryption</span></div>
              <div className={styles.badge}><span className={styles.badgeIcon}>{Icons.monitor}</span><span className={styles.badgeText}>Real-time Monitoring</span></div>
              <div className={styles.badge}><span className={styles.badgeIcon}>{Icons.key}</span><span className={styles.badgeText}>MFA Ready</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          <div className={styles.heroContent}>
            <div className={styles.heroPattern} />
            <div className={styles.heroGlow} />
            <div className={styles.heroText}>
              <h2 className={styles.heroTitle}><span className={styles.heroHighlight}>Private</span> Banking<br />Excellence</h2>
              <p className={styles.heroSubtitle}>Discreet wealth management for sophisticated investors. Precision-engineered interface for optimal control and performance.</p>
            </div>
            <div className={styles.features}>
              <div className={styles.featureCard}><div className={styles.featureIcon}>{Icons.building}</div><div className={styles.featureContent}><h3 className={styles.featureTitle}>Legacy Service</h3><p className={styles.featureText}>Bespoke relationship management with institutional-grade security</p></div></div>
              <div className={styles.featureCard}><div className={styles.featureIcon}>{Icons.globe}</div><div className={styles.featureContent}><h3 className={styles.featureTitle}>Global Reach</h3><p className={styles.featureText}>Seamless multi-jurisdictional portfolio access</p></div></div>
              <div className={styles.featureCard}><div className={styles.featureIcon}>{Icons.chart}</div><div className={styles.featureContent}><h3 className={styles.featureTitle}>Live Intelligence</h3><p className={styles.featureText}>Real-time analytics and portfolio transparency</p></div></div>
              <div className={styles.featureCard}><div className={styles.featureIcon}>{Icons.zap}</div><div className={styles.featureContent}><h3 className={styles.featureTitle}>Precision Execution</h3><p className={styles.featureText}>Ultra-responsive trading and allocation workflows</p></div></div>
            </div>
            <div className={styles.trustIndicators}>
              <div className={styles.trustItem}><span className={styles.trustNumber}>99.99%</span><span className={styles.trustLabel}>Uptime</span></div>
              <div className={styles.trustDivider} />
              <div className={styles.trustItem}><span className={styles.trustNumber}>SOC2</span><span className={styles.trustLabel}>Compliant</span></div>
              <div className={styles.trustDivider} />
              <div className={styles.trustItem}><span className={styles.trustNumber}>24/7</span><span className={styles.trustLabel}>Concierge</span></div>
            </div>
          </div>
        </div>
      </div>

      {showSecurityTip && (
        <div className={styles.securityTip} role="dialog">
          <button className={styles.closeTip} onClick={() => setShowSecurityTip(false)} aria-label="Dismiss">{Icons.x}</button>
          <div className={styles.tipHeader}><span className={styles.tipIcon}>{Icons.shield}</span><h3 className={styles.tipTitle}>Security Notice</h3></div>
          <div className={styles.tipContent}>Aldwych European Capital employs enterprise-grade security. We will <strong>never</strong> request your credentials via email, SMS, or phone.</div>
        </div>
      )}
    </>
  );
}