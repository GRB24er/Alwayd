// src/components/ChatboxReal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, X, Send, Minimize2, Maximize2, User, Shield } from "lucide-react";
import styles from "./Chatbox.module.css";

interface Message {
  _id?: string;
  message: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  timestamp: Date;
  read?: boolean;
}

interface Chat {
  _id: string;
  subject: string;
  status: 'pending' | 'active' | 'closed';
  messages: Message[];
  unreadCount?: number;
  userName: string;
  userEmail: string;
  lastMessageAt: Date;
}

export default function ChatboxReal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && session?.user) {
      loadChats();
      const interval = setInterval(loadChats, 3000);
      return () => clearInterval(interval);
    }
  }, [open, session]);

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chat/list');
      const result = await response.json();
      
      if (result.success) {
        setChats(result.data || []);
        
        if (activeChat) {
          const updated = result.data.find((c: Chat) => c._id === activeChat._id);
          if (updated) {
            setActiveChat(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const createNewChat = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Support Request',
          initialMessage: 'Hello, I need assistance with my account.'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setActiveChat(result.data);
        setChats([result.data, ...chats]);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeChat) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat._id,
          message: message.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage("");
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  if (!session) return null;

  return (
    <>
      {/* Chat Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={styles.chatTrigger}
        >
          <MessageCircle size={24} />
          <span className={styles.onlineStatus}></span>
          {chats.some(c => c.unreadCount && c.unreadCount > 0) && (
            <div style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              border: '2px solid white'
            }}>
              {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
            </div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className={`${styles.chatPopup} ${minimized ? styles.minimized : ''}`}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderTop}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} />
                  Support Chat
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                  {session.user?.name || 'Customer'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setMinimized(!minimized)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '8px', 
                    cursor: 'pointer', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setOpen(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '8px', 
                    cursor: 'pointer', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {!minimized && (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Chat List */}
              {!activeChat && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <button 
                    onClick={createNewChat} 
                    disabled={loading}
                    style={{
                      padding: '14px 20px',
                      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <MessageCircle size={18} />
                    {loading ? 'Creating...' : 'New Support Request'}
                  </button>

                  {chats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <MessageCircle size={56} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                      <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>No conversations yet</p>
                      <p style={{ margin: 0, fontSize: '14px' }}>Start a chat to get instant support</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {chats.map(chat => (
                        <div
                          key={chat._id}
                          onClick={() => setActiveChat(chat)}
                          style={{
                            padding: '16px',
                            background: 'white',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: '1px solid #e5e7eb',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#2563eb';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                            <strong style={{ color: '#1e293b', fontSize: '15px' }}>{chat.subject}</strong>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
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
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                            {chat.messages[chat.messages.length - 1]?.message.substring(0, 60)}...
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
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
                              {chat.unreadCount} new message{chat.unreadCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Active Chat */}
              {activeChat && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: '16px', borderBottom: '2px solid #f1f5f9', background: 'white' }}>
                    <button 
                      onClick={() => setActiveChat(null)}
                      style={{
                        padding: '8px 14px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '10px',
                        color: '#475569'
                      }}
                    >
                      ← Back to Chats
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '16px', color: '#1e293b' }}>{activeChat.subject}</strong>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: activeChat.status === 'pending' ? '#fef3c7' :
                                   activeChat.status === 'active' ? '#dbeafe' : '#d1fae5',
                        color: activeChat.status === 'pending' ? '#92400e' :
                               activeChat.status === 'active' ? '#1e40af' : '#065f46'
                      }}>
                        {activeChat.status}
                      </span>
                    </div>
                  </div>

                  {/* Messages - ENTERPRISE STYLE */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto', 
                    padding: '20px',
                    background: '#f8fafc'
                  }}>
                    {activeChat.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.senderRole === 'user' ? 'flex-start' : 'flex-end',
                          marginBottom: '16px',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        {/* USER MESSAGES - LEFT SIDE */}
                        {msg.senderRole === 'user' && (
                          <>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <User size={18} color="white" />
                            </div>
                            <div style={{
                              maxWidth: '70%',
                              padding: '12px 16px',
                              borderRadius: '12px 12px 12px 4px',
                              background: 'white',
                              color: '#1e293b',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ fontWeight: '600', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                                {msg.senderName}
                              </div>
                              <div style={{ lineHeight: '1.5' }}>{msg.message}</div>
                              <div style={{ fontSize: '11px', marginTop: '6px', color: '#94a3b8' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ADMIN MESSAGES - RIGHT SIDE */}
                        {msg.senderRole === 'admin' && (
                          <>
                            <div style={{
                              maxWidth: '70%',
                              padding: '12px 16px',
                              borderRadius: '12px 12px 4px 12px',
                              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                              color: 'white',
                              boxShadow: '0 2px 12px rgba(37, 99, 235, 0.25)'
                            }}>
                              <div style={{ fontWeight: '600', fontSize: '12px', opacity: 0.9, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Shield size={12} />
                                {msg.senderName || 'Support Agent'}
                              </div>
                              <div style={{ lineHeight: '1.5' }}>{msg.message}</div>
                              <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Shield size={18} color="white" />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: '16px', borderTop: '2px solid #f1f5f9', background: 'white' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your message..."
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button 
                        onClick={sendMessage} 
                        disabled={loading || !message.trim()}
                        style={{
                          padding: '12px 20px',
                          background: message.trim() ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : '#d1d5db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: message.trim() ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: '600',
                          fontSize: '14px',
                          boxShadow: message.trim() ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                        }}
                      >
                        <Send size={16} />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}