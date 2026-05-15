// src/app/profile/ProfileClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "../dashboard/dashboard.module.css";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  checkingBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  accountNumber: string;
  routingNumber: string;
  createdAt: string;
}

export default function ProfileClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.user);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
            <div>Loading your profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>
          <div style={{ textAlign: 'center', color: '#dc2626' }}>
            <p>Error: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const totalBalance = profile.checkingBalance + profile.savingsBalance + profile.investmentBalance;

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      
      <div className={styles.main}>
        <header className={styles.header}>
          <Header />
        </header>
        
        <div className={styles.content}>
          <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
              My Profile
            </h1>

            {/* Profile Card */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  color: 'white',
                  marginRight: '1.5rem'
                }}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {profile.name}
                  </h2>
                  <p style={{ color: '#6b7280' }}>{profile.email}</p>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: profile.verified ? '#10b981' : '#f59e0b',
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {profile.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Account Number
                  </p>
                  <p style={{ fontWeight: '600' }}>{profile.accountNumber}</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Routing Number
                  </p>
                  <p style={{ fontWeight: '600' }}>{profile.routingNumber}</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Account Type
                  </p>
                  <p style={{ fontWeight: '600', textTransform: 'capitalize' }}>Personal Banking</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Account Status
                  </p>
                  <p style={{ fontWeight: '600', color: '#10b981' }}>Active</p>
                </div>
              </div>
            </div>

            {/* Balance Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    💳
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Checking</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      ${profile.checkingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#f0fdfa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    🦆
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Savings</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      ${profile.savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    📈
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Investment</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      ${profile.investmentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Balance Card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '2rem',
              color: 'white',
              marginBottom: '2rem'
            }}>
              <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Total Net Worth
              </p>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/settings')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Edit Profile
              </button>
              <button
                onClick={() => router.push('/security')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Security Settings
              </button>
              <button
                onClick={() => router.push('/accounts/statements')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Download Statements
              </button>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <Footer />
        </footer>
      </div>
    </div>
  );
}