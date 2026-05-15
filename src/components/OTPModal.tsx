// src/components/OTPModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './OTPModal.module.css';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  email?: string;
  amount?: number;
  currency?: string;
  recipient?: string;
  loading?: boolean;
  error?: string;
}

export default function OTPModal({
  isOpen,
  onClose,
  onVerify,
  onResend,
  email,
  amount,
  currency = 'USD',
  recipient,
  loading = false,
  error
}: OTPModalProps) {
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(600);
      setCanResend(false);
      setOtpCode(['', '', '', '', '', '']);
      setLocalError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = [...otpCode];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      if (/\d/.test(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }
    
    setOtpCode(newOtp);
    
    // Focus last filled input or next empty
    const lastFilledIndex = newOtp.findLastIndex(digit => digit !== '');
    const focusIndex = Math.min(lastFilledIndex + 1, 5);
    document.getElementById(`otp-input-${focusIndex}`)?.focus();
    
    // Auto-submit if complete
    if (newOtp.every(digit => digit)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code?: string) => {
    const fullCode = code || otpCode.join('');
    
    if (fullCode.length !== 6) {
      setLocalError('Please enter all 6 digits');
      return;
    }

    try {
      await onVerify(fullCode);
    } catch (err) {
      setLocalError('Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setTimeLeft(600);
    setOtpCode(['', '', '', '', '', '']);
    setLocalError('');
    
    try {
      await onResend();
    } catch (err) {
      setLocalError('Failed to resend code. Please try again.');
      setCanResend(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={onClose}>×</button>
            
            <div className={styles.icon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 15v2m0 0v2m0-2h2m-2 0h-2" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 7l-2 1m-2 1l-2 1" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 7l2 1m2 1l2 1" strokeWidth="2" strokeLinecap="round"/>
                <rect x="3" y="11" width="18" height="10" rx="2" strokeWidth="2"/>
              </svg>
            </div>

            <h2 className={styles.title}>Verification Required</h2>
            
            <p className={styles.description}>
              We've sent a 6-digit verification code to<br />
              <strong>{email || 'your registered email'}</strong>
            </p>

            {amount && recipient && (
              <div className={styles.transactionInfo}>
                <span>Transfer Amount:</span>
                <strong>{currency} {amount.toLocaleString()}</strong>
                {recipient && (
                  <>
                    <span>To:</span>
                    <strong>{recipient}</strong>
                  </>
                )}
              </div>
            )}

            <div className={styles.otpInputs}>
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{1}"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`${styles.otpInput} ${error || localError ? styles.error : ''}`}
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {(error || localError) && (
              <div className={styles.errorMessage}>
                {error || localError}
              </div>
            )}

            <div className={styles.timer}>
              {timeLeft > 0 ? (
                <>
                  <span>Code expires in</span>
                  <strong>{formatTime(timeLeft)}</strong>
                </>
              ) : (
                <span className={styles.expired}>Code expired</span>
              )}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.verifyBtn}
                onClick={() => handleVerify()}
                disabled={loading || otpCode.some(d => !d)}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={!canResend || loading}
              >
                {canResend ? 'Resend Code' : `Resend in ${formatTime(60)}`}
              </button>
            </div>

            <div className={styles.securityNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path d="M12 2L4 7v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V7l-8-5z" strokeWidth="2"/>
              </svg>
              <span>Never share this code with anyone. Our staff will never ask for it.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// src/components/OTPModal.module.css
/*
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 440px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.closeBtn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.closeBtn:hover {
  background: #f5f5f5;
}

.icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon svg {
  width: 32px;
  height: 32px;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #333;
}

.description {
  text-align: center;
  color: #666;
  margin: 0 0 24px;
  line-height: 1.5;
}

.transactionInfo {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

.transactionInfo span {
  color: #666;
}

.transactionInfo strong {
  text-align: right;
  color: #333;
}

.otpInputs {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.otpInput {
  width: 48px;
  height: 56px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  transition: all 0.2s;
}

.otpInput:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.otpInput.error {
  border-color: #ef4444;
}

.otpInput:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.errorMessage {
  text-align: center;
  color: #ef4444;
  font-size: 14px;
  margin-bottom: 16px;
}

.timer {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.timer strong {
  color: #333;
  font-weight: 600;
}

.expired {
  color: #ef4444;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verifyBtn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.verifyBtn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.verifyBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.resendBtn {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.resendBtn:hover:not(:disabled) {
  background: #f8f9ff;
}

.resendBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #999;
  border-color: #ddd;
}

.securityNote {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

.securityNote svg {
  flex-shrink: 0;
  color: #667eea;
}
*/