// src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./settings.module.css";

// SVG Icons
const Icons = {
  profile: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  security: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  notifications: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  privacy: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  billing: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><polyline points="20 6 9 17 4 12"/></svg>),
};

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: number;
}

interface NotificationSettings {
  transactionAlerts: boolean;
  accountUpdates: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  monthlyStatements: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: ''
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    biometricEnabled: false,
    loginAlerts: true,
    sessionTimeout: 30
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    transactionAlerts: true,
    accountUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
    monthlyStatements: true
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch user settings from API
  useEffect(() => {
    if (session?.user?.email) {
      fetchUserSettings();
    }
  }, [session]);

  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) setProfile(data.profile);
        if (data.security) setSecurity(data.security);
        if (data.notifications) setNotifications(data.notifications);
      } else {
        // Fallback to session data if settings API doesn't exist
        if (session?.user) {
          const nameParts = (session.user.name || '').split(' ');
          setProfile(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: session.user?.email || ''
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Use session data as fallback
      if (session?.user) {
        const nameParts = (session.user.name || '').split(' ');
        setProfile(prev => ({
          ...prev,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: session.user?.email || ''
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });

      if (response.ok) {
        setSavedMessage('Profile updated successfully');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ security })
      });

      if (response.ok) {
        setSavedMessage('Security settings updated');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });

      if (response.ok) {
        setSavedMessage('Password changed successfully');
        setPasswords({ current: '', new: '', confirm: '' });
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications })
      });

      if (response.ok) {
        setSavedMessage('Notification preferences saved');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.content}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid rgba(201,169,98,0.2)', borderTopColor: '#c9a962', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <h1>Settings</h1>
            <p>Manage your account preferences and security settings</p>
          </div>

          {savedMessage && (
            <div className={styles.successMessage}>
              {Icons.check} {savedMessage}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className={styles.settingsContainer}>
            <div className={styles.settingsTabs}>
              <button 
                className={activeTab === 'profile' ? styles.activeTab : ''}
                onClick={() => setActiveTab('profile')}
              >
                {Icons.profile} Profile
              </button>
              <button 
                className={activeTab === 'security' ? styles.activeTab : ''}
                onClick={() => setActiveTab('security')}
              >
                {Icons.security} Security
              </button>
              <button 
                className={activeTab === 'notifications' ? styles.activeTab : ''}
                onClick={() => setActiveTab('notifications')}
              >
                {Icons.notifications} Notifications
              </button>
              <button 
                className={activeTab === 'privacy' ? styles.activeTab : ''}
                onClick={() => setActiveTab('privacy')}
              >
                {Icons.privacy} Privacy
              </button>
              <button 
                className={activeTab === 'billing' ? styles.activeTab : ''}
                onClick={() => setActiveTab('billing')}
              >
                {Icons.billing} Billing
              </button>
            </div>

            <div className={styles.settingsContent}>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className={styles.profileSettings}>
                  <h2>Profile Information</h2>
                  <form className={styles.settingsForm} onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>First Name</label>
                        <input 
                          type="text" 
                          value={profile.firstName}
                          onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Last Name</label>
                        <input 
                          type="text" 
                          value={profile.lastName}
                          onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        placeholder="Enter email"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Phone Number</label>
                      <input 
                        type="tel" 
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Address</label>
                      <input 
                        type="text" 
                        value={profile.address}
                        onChange={(e) => setProfile({...profile, address: e.target.value})}
                        placeholder="Street address"
                      />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>City</label>
                        <input 
                          type="text" 
                          value={profile.city}
                          onChange={(e) => setProfile({...profile, city: e.target.value})}
                          placeholder="City"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Postal Code</label>
                        <input 
                          type="text" 
                          value={profile.postalCode}
                          onChange={(e) => setProfile({...profile, postalCode: e.target.value})}
                          placeholder="Postal code"
                        />
                      </div>
                    </div>
                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className={styles.securitySettings}>
                  <h2>Security Settings</h2>
                  <div className={styles.securityOptions}>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Two-Factor Authentication</h3>
                        <p>Add an extra layer of security to your account</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={security.twoFactorEnabled}
                          onChange={(e) => setSecurity({...security, twoFactorEnabled: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Biometric Login</h3>
                        <p>Use fingerprint or face recognition</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox"
                          checked={security.biometricEnabled}
                          onChange={(e) => setSecurity({...security, biometricEnabled: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Login Alerts</h3>
                        <p>Get notified of new sign-ins to your account</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={security.loginAlerts}
                          onChange={(e) => setSecurity({...security, loginAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  </div>
                  <button className={styles.saveBtn} onClick={handleSaveSecurity} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </button>

                  <div className={styles.passwordSection}>
                    <h3>Change Password</h3>
                    <form className={styles.settingsForm} onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                      <div className={styles.formGroup}>
                        <label>Current Password</label>
                        <input 
                          type="password"
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>New Password</label>
                        <input 
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Confirm New Password</label>
                        <input 
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <button type="submit" className={styles.saveBtn} disabled={saving}>
                        {saving ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className={styles.notificationSettings}>
                  <h2>Notification Preferences</h2>
                  <div className={styles.notificationOptions}>
                    <div className={styles.notificationItem}>
                      <div>
                        <h3>Transaction Alerts</h3>
                        <p>Receive alerts for all account transactions</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={notifications.transactionAlerts}
                          onChange={(e) => setNotifications({...notifications, transactionAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.notificationItem}>
                      <div>
                        <h3>Account Updates</h3>
                        <p>Important account information and changes</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={notifications.accountUpdates}
                          onChange={(e) => setNotifications({...notifications, accountUpdates: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.notificationItem}>
                      <div>
                        <h3>Security Alerts</h3>
                        <p>Suspicious activity and security notifications</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={notifications.securityAlerts}
                          onChange={(e) => setNotifications({...notifications, securityAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.notificationItem}>
                      <div>
                        <h3>Monthly Statements</h3>
                        <p>Receive monthly account statements via email</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={notifications.monthlyStatements}
                          onChange={(e) => setNotifications({...notifications, monthlyStatements: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.notificationItem}>
                      <div>
                        <h3>Marketing Emails</h3>
                        <p>Promotions, offers and product updates</p>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox"
                          checked={notifications.marketingEmails}
                          onChange={(e) => setNotifications({...notifications, marketingEmails: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  </div>
                  <button className={styles.saveBtn} onClick={handleSaveNotifications} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className={styles.profileSettings}>
                  <h2>Privacy Settings</h2>
                  <div className={styles.securityOptions}>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Data Sharing</h3>
                        <p>Control how your data is shared with partners</p>
                      </div>
                      <label className={styles.switch}>
                        <input type="checkbox" />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Activity Tracking</h3>
                        <p>Allow us to track your activity for better recommendations</p>
                      </div>
                      <label className={styles.switch}>
                        <input type="checkbox" defaultChecked />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                    <div className={styles.securityItem}>
                      <div>
                        <h3>Profile Visibility</h3>
                        <p>Make your profile visible to other users</p>
                      </div>
                      <label className={styles.switch}>
                        <input type="checkbox" />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  </div>
                  <button className={styles.saveBtn}>Save Privacy Settings</button>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className={styles.profileSettings}>
                  <h2>Billing & Subscription</h2>
                  <div className={styles.securityItem} style={{ marginBottom: '1rem' }}>
                    <div>
                      <h3>Current Plan</h3>
                      <p>Premium Account - Unlimited transfers</p>
                    </div>
                    <span style={{ background: 'linear-gradient(135deg, #c9a962 0%, #a8935f 100%)', color: '#1a1f2e', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: '600', fontSize: '0.75rem' }}>ACTIVE</span>
                  </div>
                  <div className={styles.securityItem}>
                    <div>
                      <h3>Billing Cycle</h3>
                      <p>Next billing date: 1st of each month</p>
                    </div>
                  </div>
                  <button className={styles.saveBtn} style={{ marginTop: '1.5rem' }}>Manage Subscription</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}