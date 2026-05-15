// src/components/OTPInput.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './OTPInput.module.css';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onResend?: () => void;
  loading?: boolean;
  error?: string;
  success?: boolean;
}

export default function OTPInput({
  length = 6,
  onComplete,
  onResend,
  loading = false,
  error,
  success = false
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits entered
    if (newOtp.every(digit => digit !== '') && !loading) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Only accept digits
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, length).split('');
    const newOtp = [...otp];
    
    digits.forEach((digit, index) => {
      if (index < length) {
        newOtp[index] = digit;
      }
    });
    
    setOtp(newOtp);
    
    // Focus last filled input or first empty
    const lastFilledIndex = digits.length - 1;
    if (lastFilledIndex < length - 1) {
      inputRefs.current[lastFilledIndex + 1]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }

    // Auto-submit if complete
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0 || loading) return;
    
    setOtp(Array(length).fill(''));
    setResendCooldown(60);
    inputRefs.current[0]?.focus();
    
    if (onResend) {
      onResend();
    }
  };

  const clearOTP = () => {
    setOtp(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.inputGroup} ${error ? styles.error : ''} ${success ? styles.success : ''}`}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={loading || success}
            className={styles.input}
            autoComplete="off"
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Code verified successfully
        </div>
      )}

      {onResend && (
        <div className={styles.actions}>
          {resendCooldown > 0 ? (
            <span className={styles.cooldown}>
              Resend code in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className={styles.resendButton}
            >
              Resend Code
            </button>
          )}
          
          <button
            type="button"
            onClick={clearOTP}
            disabled={loading || success}
            className={styles.clearButton}
          >
            Clear
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span>Verifying...</span>
        </div>
      )}
    </div>
  );
}