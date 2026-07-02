// src/app/dashboard/admin/chats/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { User, Shield, Send } from 'lucide-react';
import styles from '../admin.module.css';

interface Message {
  message: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  timestamp: Date;
}

interface Chat {
  _id: string;
  userId: {
    name: string;
    email: string;
  };
  userName: string;
  userEmail: string;
  subject: string;
  status: 'pending' | 'active' | 'closed';
  messages: Message[];
  createdAt: string;
  lastMessageAt: string;
  unreadCount?: number;
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadChats = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/chat/list'
        : `/api/chat/list?status=${filter}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setChats(result.data || []);
        
        if (selectedChat) {
          const updated = result.data.find((c: Chat) => c._id === selectedChat._id);
          if (updated) {
            setSelectedChat(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat._id,
          message: message.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('');
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Support Chats</h1>
          <div className={styles.headerActions}>
            <button onClick={loadChats} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Total Chats</h3>
            <p>{chats.length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Pending</h3>
            <p>{chats.filter(c => c.status === 'pending').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Active</h3>
            <p>{chats.filter(c => c.status === 'active').length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Closed</h3>
            <p>{chats.filter(c => c.status === 'closed').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.tabs}>
          {['all', 'pending', 'active', 'closed'].map(f => (
            <button
              key={f}
              className={filter === f ? styles.activeTab : ''}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Chat Interface */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '380px 1fr', 
          gap: '20px', 
          background: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          height: '650px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb'
        }}>
          {/* Chat List */}
          <div style={{ 
            borderRight: '2px solid #f1f5f9', 
            overflow: 'auto',
            background: '#f9fafb'
          }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>No chats found</p>
                <p style={{ fontSize: '14px' }}>Waiting for customer inquiries</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    padding: '18px',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    background: selectedChat?._id === chat._id ? 'white' : 'transparent',
                    transition: 'all 0.2s',
                    borderLeft: selectedChat?._id === chat._id ? '4px solid #2563eb' : '4px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <strong style={{ color: '#1e293b', fontSize: '15px' }}>
                      {chat.userName || chat.userId?.name || 'Unknown User'}
                    </strong>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: chat.status === 'pending' ? '#fef3c7' : 
                                 chat.status === 'active' ? '#dbeafe' : '#d1fae5',
                      color: chat.status === 'pending' ? '#92400e' :
                             chat.status === 'active' ? '#1e40af' : '#065f46'
                    }}>
                      {chat.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                    {chat.subject}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                    {chat.messages[chat.messages.length - 1]?.message.substring(0, 45)}...
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {new Date(chat.lastMessageAt).toLocaleString()}
                  </div>
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '5px 10px',
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'inline-block'
                    }}>
                      {chat.unreadCount} new
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Messages */}
          {selectedChat ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Chat Header */}
              <div style={{ 
                padding: '20px 24px', 
                borderBottom: '2px solid #f1f5f9',
                background: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                      {selectedChat.userName || selectedChat.userId?.name || 'Unknown User'}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      {selectedChat.userEmail || selectedChat.userId?.email}
                    </p>
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    background: selectedChat.status === 'pending' ? '#fef3c7' :
                               selectedChat.status === 'active' ? '#dbeafe' : '#d1fae5',
                    color: selectedChat.status === 'pending' ? '#92400e' :
                           selectedChat.status === 'active' ? '#1e40af' : '#065f46'
                  }}>
                    {selectedChat.status}
                  </span>
                </div>
              </div>

              {/* Messages - ENTERPRISE STYLE */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '24px',
                background: '#f8fafc'
              }}>
                {selectedChat.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: msg.senderRole === 'user' ? 'flex-start' : 'flex-end',
                      marginBottom: '16px',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    {/* USER MESSAGES - LEFT SIDE */}
                    {msg.senderRole === 'user' && (
                      <>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                        }}>
                          <User size={20} color="white" />
                        </div>
                        <div style={{
                          maxWidth: '65%',
                          padding: '14px 18px',
                          borderRadius: '16px 16px 16px 4px',
                          background: 'white',
                          color: '#1e293b',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontWeight: '700', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                            {msg.senderName}
                          </div>
                          <div style={{ lineHeight: '1.6', fontSize: '14px' }}>{msg.message}</div>
                          <div style={{ fontSize: '11px', marginTop: '8px', color: '#94a3b8' }}>
                            {new Date(msg.timestamp).toLocaleString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ADMIN MESSAGES - RIGHT SIDE */}
                    {msg.senderRole === 'admin' && (
                      <>
                        <div style={{
                          maxWidth: '65%',
                          padding: '14px 18px',
                          borderRadius: '16px 16px 4px 16px',
                          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}>
                          <div style={{ 
                            fontWeight: '700', 
                            fontSize: '12px', 
                            opacity: 0.95, 
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Shield size={14} />
                            {msg.senderName || 'Support Agent'}
                          </div>
                          <div style={{ lineHeight: '1.6', fontSize: '14px' }}>{msg.message}</div>
                          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.85 }}>
                            {new Date(msg.timestamp).toLocaleString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}>
                          <Shield size={20} color="white" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {selectedChat.status !== 'closed' && (
                <div style={{ 
                  padding: '20px 24px', 
                  borderTop: '2px solid #f1f5f9',
                  background: 'white'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your response..."
                      disabled={sendingMessage}
                      style={{
                        flex: 1,
                        padding: '14px 18px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendingMessage || !message.trim()}
                      style={{
                        padding: '14px 24px',
                        background: message.trim() ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: message.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: message.trim() ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Send size={16} />
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '16px',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <Shield size={56} style={{ opacity: 0.3 }} />
              <p style={{ fontWeight: '600', color: '#1e293b' }}>Select a chat to view messages</p>
              <p style={{ fontSize: '14px' }}>Choose a conversation from the left sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}