// src/app/security/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./security.module.css";

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  loginAlerts: boolean;
  biometricEnabled: boolean;
  deviceTrust: boolean;
  locationSecurity: boolean;
  sessionTimeout: number;
  score: number;
  passwordAgeDays: number;
  trustedDevices: any[];
}

interface ActivityItem {
  id: string;
  action: string;
  device: string;
  location: string;
  time: string;
  status: "success" | "failed";
}

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    twoFactorMethod: "sms",
    loginAlerts: true,
    biometricEnabled: false,
    deviceTrust: true,
    locationSecurity: false,
    sessionTimeout: 15,
    score: 50,
    passwordAgeDays: 0,
    trustedDevices: []
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchSecuritySettings();
    }
  }, [status]);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch("/api/user/security");
      const data = await response.json();
      
      if (data.success) {
        setSecurity(data.security);
        setRecentActivity(data.recentActivity || []);
      }
    } catch (error) {
      console.error("Failed to fetch security settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });

      const data = await response.json();

      if (data.success) {
        setSecurity(prev => ({ ...prev, [key]: value }));
        showMessage("success", "Setting updated successfully");
      } else {
        showMessage("error", data.error || "Failed to update");
      }
    } catch (error) {
      showMessage("error", "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showMessage("error", "Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Password changed successfully");
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        fetchSecuritySettings(); // Refresh to update password age
      } else {
        showMessage("error", data.error || "Failed to change password");
      }
    } catch (error) {
      showMessage("error", "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#16a34a";
    if (score >= 60) return "#f59e0b";
    return "#dc2626";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Weak";
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loading}>Loading security settings...</div>
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
          {/* Message */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.pageHeader}>
            <div>
              <h1>Security Center</h1>
              <p>Protect your account and monitor security settings</p>
            </div>
            <div className={styles.securityScoreCard}>
              <div className={styles.scoreLabel}>Security Score</div>
              <div 
                className={styles.scoreValue}
                style={{ color: getScoreColor(security.score) }}
              >
                {security.score}%
              </div>
              <div className={styles.scoreStatus}>{getScoreLabel(security.score)}</div>
            </div>
          </div>

          {/* Security Status Cards */}
          <div className={styles.statusCards}>
            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ 
                background: security.twoFactorEnabled ? '#dcfce7' : '#fee2e2' 
              }}>
                <span style={{ color: security.twoFactorEnabled ? '#16a34a' : '#dc2626' }}>
                  {security.twoFactorEnabled ? '✓' : '✕'}
                </span>
              </div>
              <div className={styles.statusContent}>
                <h3>Two-Factor Authentication</h3>
                <p>{security.twoFactorEnabled ? `Enabled - ${security.twoFactorMethod.toUpperCase()}` : 'Not enabled'}</p>
              </div>
              <button 
                className={styles.manageBtn}
                onClick={() => updateSetting("twoFactorEnabled", !security.twoFactorEnabled)}
                disabled={saving}
              >
                {security.twoFactorEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ 
                background: security.loginAlerts ? '#dcfce7' : '#fee2e2' 
              }}>
                <span style={{ color: security.loginAlerts ? '#16a34a' : '#dc2626' }}>
                  {security.loginAlerts ? '✓' : '✕'}
                </span>
              </div>
              <div className={styles.statusContent}>
                <h3>Login Alerts</h3>
                <p>{security.loginAlerts ? 'Active - Email & SMS' : 'Disabled'}</p>
              </div>
              <button 
                className={styles.manageBtn}
                onClick={() => updateSetting("loginAlerts", !security.loginAlerts)}
                disabled={saving}
              >
                Configure
              </button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ 
                background: security.passwordAgeDays > 90 ? '#fee2e2' : 
                           security.passwordAgeDays > 60 ? '#fef3c7' : '#dcfce7'
              }}>
                <span style={{ 
                  color: security.passwordAgeDays > 90 ? '#dc2626' : 
                         security.passwordAgeDays > 60 ? '#f59e0b' : '#16a34a'
                }}>
                  {security.passwordAgeDays > 90 ? '!' : '✓'}
                </span>
              </div>
              <div className={styles.statusContent}>
                <h3>Password Strength</h3>
                <p>Last changed {security.passwordAgeDays} days ago</p>
              </div>
              <button 
                className={styles.updateBtn}
                onClick={() => setShowPasswordModal(true)}
              >
                Update
              </button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ background: '#dcfce7' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
              </div>
              <div className={styles.statusContent}>
                <h3>Device Management</h3>
                <p>{security.trustedDevices.length || 1} trusted device(s)</p>
              </div>
              <button className={styles.manageBtn}>View Devices</button>
            </div>
          </div>

          {/* Security Features */}
          <div className={styles.featuresSection}>
            <h2>Security Features</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>🔐 Biometric Authentication</h3>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={security.biometricEnabled}
                      onChange={(e) => updateSetting("biometricEnabled", e.target.checked)}
                      disabled={saving}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Use fingerprint or face recognition for quick and secure access</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>📱 Device Trust</h3>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={security.deviceTrust}
                      onChange={(e) => updateSetting("deviceTrust", e.target.checked)}
                      disabled={saving}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Remember trusted devices for 30 days</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>🌍 Location Security</h3>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={security.locationSecurity}
                      onChange={(e) => updateSetting("locationSecurity", e.target.checked)}
                      disabled={saving}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Block access from unusual locations</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>⏰ Session Timeout</h3>
                  <select 
                    className={styles.timeoutSelect}
                    value={security.sessionTimeout}
                    onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value))}
                    disabled={saving}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
                <p>Automatically log out after inactivity</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.activitySection}>
            <div className={styles.activityHeader}>
              <h2>Recent Security Activity</h2>
              <button className={styles.viewAllBtn}>View All</button>
            </div>
            <div className={styles.activityList}>
              {recentActivity.length === 0 ? (
                <div className={styles.noActivity}>No recent security activity</div>
              ) : (
                recentActivity.map(activity => (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      {activity.status === 'success' ? '✓' : '⚠️'}
                    </div>
                    <div className={styles.activityDetails}>
                      <div className={styles.activityAction}>{activity.action}</div>
                      <div className={styles.activityMeta}>
                        {activity.device} • {activity.location} • {activity.time}
                      </div>
                    </div>
                    <div className={`${styles.activityStatus} ${activity.status === 'success' ? styles.success : styles.failed}`}>
                      {activity.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}