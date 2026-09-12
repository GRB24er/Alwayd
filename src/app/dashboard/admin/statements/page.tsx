// src/app/dashboard/admin/statements/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, User } from 'lucide-react';
import styles from '../admin.module.css';

interface StatementRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  accountType: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'sent' | 'failed';
  requestedAt: string;
  sentAt?: string;
}

export default function AdminStatementsPage() {
  const [requests, setRequests] = useState<StatementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  // Manual send form
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountType, setAccountType] = useState('checking');

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadRequests = async () => {
    try {
      const url = filter === 'all'
        ? '/api/statements/list'
        : `/api/statements/list?status=${filter}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setRequests(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendStatement = async (requestId: string) => {
    setSendingId(requestId);
    try {
      const response = await fetch('/api/statements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });

      const result = await response.json();

      if (result.success) {
        loadRequests();
      } else {
        alert(result.error || 'Failed to send statement');
      }
    } catch (error) {
      alert('Failed to send statement');
    } finally {
      setSendingId(null);
    }
  };

  const sendManualStatement = async () => {
    if (!selectedUser || !startDate || !endDate) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/statements/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          startDate,
          endDate,
          accountType
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Statement sent successfully!');
        setSelectedUser('');
        setStartDate('');
        setEndDate('');
        loadRequests();
      } else {
        alert(result.error || 'Failed to send statement');
      }
    } catch (error) {
      alert('Failed to send statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Email Statements</h1>
          <div className={styles.headerActions}>
            <button onClick={loadRequests} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Total Requests</h3>
            <p>{requests.length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Pending</h3>
            <p>{requests.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Sent</h3>
            <p>{requests.filter(r => r.status === 'sent').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Failed</h3>
            <p>{requests.filter(r => r.status === 'failed').length}</p>
          </div>
        </div>

        {/* Manual Send Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={24} />
            Send Manual Statement
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                User Email
              </label>
              <input
                type="email"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="user@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min={startDate}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
              </select>
            </div>

            <button
              onClick={sendManualStatement}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.tabs}>
          {['all', 'pending', 'sent', 'failed'].map(f => (
            <button
              key={f}
              className={filter === f ? styles.activeTab : ''}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Mail size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>No statement requests</p>
              <p>Waiting for user requests</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    User
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Account Type
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Date Range
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Requested
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <User size={18} color="white" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                            {req.userId?.name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {req.userId?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569', textTransform: 'capitalize' }}>
                      {req.accountType}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: req.status === 'pending' ? '#fef3c7' :
                                   req.status === 'sent' ? '#d1fae5' : '#fee2e2',
                        color: req.status === 'pending' ? '#92400e' :
                               req.status === 'sent' ? '#065f46' : '#991b1b'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                      {new Date(req.requestedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => sendStatement(req._id)}
                          disabled={sendingId === req._id}
                          style={{
                            padding: '8px 16px',
                            background: sendingId === req._id ? '#cbd5e1' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: sendingId === req._id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {sendingId === req._id ? 'Sending...' : (
                            <>
                              <Send size={14} />
                              Send
                            </>
                          )}
                        </button>
                      )}
                      {req.status === 'sent' && (
                        <span style={{ color: '#10b981', fontWeight: '600', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={16} />
                          Sent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}