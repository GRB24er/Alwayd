// src/app/dashboard/admin/credit-cards/page.tsx
"use client";

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface Application {
  _id: string;
  applicationNumber: string;
  status: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  employmentInfo: {
    status: string;
    employer: string;
    annualIncome: number;
  };
  cardPreferences: {
    cardType: string;
    requestedCreditLimit: number;
  };
  createdAt: string;
}

export default function AdminCreditCardsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const [creditLimit, setCreditLimit] = useState(5000);
  const [interestRate, setInterestRate] = useState(18.99);
  const [annualFee, setAnnualFee] = useState(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/creditcard/admin/list'
        : `/api/creditcard/admin/list?status=${filter}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setApplications(result.data.applications || []);
        setMessage(`Loaded ${result.data.applications?.length || 0} applications`);
      }
    } catch (error) {
      setMessage('Failed to fetch applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedApp) return;

    setLoading(true);
    try {
      const response = await fetch('/api/creditcard/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationNumber: selectedApp.applicationNumber,
          action,
          reason,
          creditLimit,
          interestRate,
          annualFee
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`Application ${action}d successfully!`);
        setShowModal(false);
        setSelectedApp(null);
        fetchApplications();
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      setMessage('Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (app: Application) => {
    setSelectedApp(app);
    setShowModal(true);
    
    const defaults: any = {
      platinum: { limit: 15000, rate: 15.99, fee: 495 },
      gold: { limit: 10000, rate: 16.99, fee: 295 },
      silver: { limit: 7500, rate: 17.99, fee: 95 },
      basic: { limit: 5000, rate: 18.99, fee: 0 },
      student: { limit: 2000, rate: 19.99, fee: 0 }
    };
    
    const cardType = app.cardPreferences?.cardType || 'basic';
    const def = defaults[cardType] || defaults.basic;
    
    setCreditLimit(def.limit);
    setInterestRate(def.rate);
    setAnnualFee(def.fee);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      submitted: '#fbbf24',
      approved: '#10b981',
      declined: '#ef4444',
      pending: '#f59e0b',
      under_review: '#3b82f6'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Credit Card Applications</h1>
          <div className={styles.headerActions}>
            <button onClick={fetchApplications} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={styles.message}>
            {message}
          </div>
        )}

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Total Applications</h3>
            <p>{applications.length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Pending</h3>
            <p>{applications.filter(a => a.status === 'submitted').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Approved</h3>
            <p>{applications.filter(a => a.status === 'approved').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Declined</h3>
            <p>{applications.filter(a => a.status === 'declined').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.tabs}>
          {['all', 'submitted', 'approved', 'declined', 'under_review'].map(f => (
            <button
              key={f}
              className={filter === f ? styles.activeTab : ''}
              onClick={() => setFilter(f)}
            >
              {f.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Applications Table */}
        {loading ? (
          <div className={styles.message}>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className={styles.message}>No applications found</div>
        ) : (
          <table className={styles.transactionTable}>
            <thead>
              <tr>
                <th>Application #</th>
                <th>Applicant</th>
                <th>Card Type</th>
                <th>Income</th>
                <th>Requested Limit</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {app.applicationNumber}
                  </td>
                  <td>
                    <div>
                      <strong>{app.personalInfo?.firstName} {app.personalInfo?.lastName}</strong>
                      <br />
                      <small style={{ color: '#64748b' }}>{app.personalInfo?.email}</small>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {app.cardPreferences?.cardType || 'N/A'}
                  </td>
                  <td>${app.employmentInfo?.annualIncome?.toLocaleString() || '0'}</td>
                  <td>${app.cardPreferences?.requestedCreditLimit?.toLocaleString() || '0'}</td>
                  <td>
                    <span 
                      className={styles.status}
                      style={{
                        background: `${getStatusColor(app.status)}20`,
                        color: getStatusColor(app.status)
                      }}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => openModal(app)}
                      className={styles.approveBtn}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>
              Review Application
            </h2>

            {/* Applicant Info */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              background: '#f9fafb', 
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#1e293b' }}>Applicant Details</h3>
              <p><strong>Name:</strong> {selectedApp.personalInfo?.firstName} {selectedApp.personalInfo?.lastName}</p>
              <p><strong>Email:</strong> {selectedApp.personalInfo?.email}</p>
              <p><strong>Phone:</strong> {selectedApp.personalInfo?.phone}</p>
              <p><strong>Employer:</strong> {selectedApp.employmentInfo?.employer || 'N/A'}</p>
              <p><strong>Annual Income:</strong> ${selectedApp.employmentInfo?.annualIncome?.toLocaleString()}</p>
              <p><strong>Card Type:</strong> {selectedApp.cardPreferences?.cardType}</p>
              <p><strong>Requested Limit:</strong> ${selectedApp.cardPreferences?.requestedCreditLimit?.toLocaleString()}</p>
            </div>

            {/* Approval Form */}
            <div className={styles.formGroup}>
              <label>Credit Limit ($)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Annual Fee ($)</label>
              <input
                type="number"
                value={annualFee}
                onChange={(e) => setAnnualFee(Number(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Reason / Notes</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for decision..."
                style={{ minHeight: '80px', width: '100%' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => handleAction('approve')}
                disabled={loading}
                className={styles.approveBtn}
                style={{ flex: 1 }}
              >
                {loading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={loading}
                className={styles.declineBtn}
                style={{ flex: 1 }}
              >
                {loading ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: '#fff',
                  color: '#64748b',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}