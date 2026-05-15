// src/app/admin/credit-cards/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

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
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form fields for approval
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
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedApp) return;

    setActionLoading(true);
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
        alert(`Application ${action}d successfully!`);
        setShowModal(false);
        setSelectedApp(null);
        fetchApplications();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to process action');
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (app: Application) => {
    setSelectedApp(app);
    setShowModal(true);
    
    // Set default values based on card type
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Header />
        
        <div style={{ padding: '30px' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
              Credit Card Applications
            </h1>
            <p style={{ color: '#64748b' }}>Review and manage credit card applications</p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            {['all', 'submitted', 'approved', 'declined', 'under_review'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px',
                  background: filter === f ? '#D4AF37' : '#fff',
                  color: filter === f ? '#fff' : '#64748b',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Applications Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              No applications found
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Application #</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Applicant</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Card Type</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Income</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Date</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px', color: '#1e293b', fontFamily: 'monospace' }}>
                        {app.applicationNumber}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>
                          {app.personalInfo?.firstName} {app.personalInfo?.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {app.personalInfo?.email}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textTransform: 'capitalize', color: '#1e293b' }}>
                        {app.cardPreferences?.cardType || 'N/A'}
                      </td>
                      <td style={{ padding: '16px', color: '#1e293b' }}>
                        ${app.employmentInfo?.annualIncome?.toLocaleString() || '0'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: `${getStatusColor(app.status)}20`,
                          color: getStatusColor(app.status)
                        }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => openModal(app)}
                          style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>
              Review Application
            </h2>

            {/* Applicant Info */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#1e293b' }}>Applicant Details</h3>
              <p><strong>Name:</strong> {selectedApp.personalInfo?.firstName} {selectedApp.personalInfo?.lastName}</p>
              <p><strong>Email:</strong> {selectedApp.personalInfo?.email}</p>
              <p><strong>Phone:</strong> {selectedApp.personalInfo?.phone}</p>
              <p><strong>Employment:</strong> {selectedApp.employmentInfo?.employer || 'N/A'}</p>
              <p><strong>Annual Income:</strong> ${selectedApp.employmentInfo?.annualIncome?.toLocaleString()}</p>
              <p><strong>Card Type:</strong> {selectedApp.cardPreferences?.cardType}</p>
              <p><strong>Requested Limit:</strong> ${selectedApp.cardPreferences?.requestedCreditLimit?.toLocaleString()}</p>
            </div>

            {/* Approval Form */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1e293b' }}>
                Credit Limit ($)
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1e293b' }}>
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1e293b' }}>
                Annual Fee ($)
              </label>
              <input
                type="number"
                value={annualFee}
                onChange={(e) => setAnnualFee(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1e293b' }}>
                Reason / Notes
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for decision..."
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '80px' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: actionLoading ? '#9ca3af' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: actionLoading ? '#9ca3af' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#64748b',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
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