// src/app/support/page.tsx
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./support.module.css";

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Function to trigger the global chatbox
  const openGlobalChat = () => {
    // Dispatch a custom event to open the chatbox
    window.dispatchEvent(new CustomEvent('openChatbox'));
  };

  const faqs = [
    {
      category: "Account",
      questions: [
        { q: "How do I reset my password?", a: "You can reset your password from the login page by clicking 'Forgot Password' or from your account settings." },
        { q: "How do I update my personal information?", a: "Go to Settings > Profile to update your personal information." },
        { q: "What are the account requirements?", a: "You need to be 18+ with a valid ID and Social Security number to open an account." }
      ]
    },
    {
      category: "Transfers",
      questions: [
        { q: "How long do transfers take?", a: "Internal transfers are instant. External transfers take 1-3 business days." },
        { q: "What are the transfer limits?", a: "Daily limit is $100,000 for wire transfers and $10,000 for external transfers." },
        { q: "Are there transfer fees?", a: "Internal transfers are free. Wire transfers have a $25 fee." }
      ]
    },
    {
      category: "Security",
      questions: [
        { q: "How is my account protected?", a: "We use 256-bit encryption, two-factor authentication, and FDIC insurance up to $250,000." },
        { q: "What should I do if I notice suspicious activity?", a: "Contact us immediately at 1-800-HORIZON or lock your card in the app." },
        { q: "How do I enable two-factor authentication?", a: "Go to Settings > Security and enable 2FA with your phone number." }
      ]
    }
  ];

  const contactOptions = [
    { 
      icon: "💬", 
      title: "Live Chat", 
      desc: "Chat with our AI assistant", 
      available: "24/7", 
      action: openGlobalChat // Use the global chat
    },
    { 
      icon: "📞", 
      title: "Phone Support", 
      desc: "Call us anytime", 
      available: "24/7", 
      action: () => window.location.href = "tel:1800ZentriBank" 
    },
    { 
      icon: "📧", 
      title: "Email Support", 
      desc: "Get help via email", 
      available: "1-2 business days", 
      action: () => window.location.href = "mailto:admin@zentribank.capital" 
    },
    { 
      icon: "📅", 
      title: "Schedule Call", 
      desc: "Book a call with an expert", 
      available: "Mon-Fri 9AM-5PM", 
      action: openGlobalChat // This will open chat with "Schedule a call" intent
    }
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerInfo}>
              <h1>Help & Support</h1>
              <p>Get assistance with your account and banking needs</p>
            </div>
            <div className={styles.emergencyContact}>
              <span>Need urgent help?</span>
              <a href="tel:1800ZentriBank" className={styles.phoneNumber}>
                📞 1-800-ZentriBank
              </a>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Search for help articles, FAQs, or topics..."
                className={styles.searchInput}
              />
              <button className={styles.searchBtn}>Search</button>
            </div>
          </div>

          {/* Contact Options */}
          <div className={styles.contactGrid}>
            {contactOptions.map((option, idx) => (
              <div key={idx} className={styles.contactCard} onClick={option.action}>
                <div className={styles.contactIcon}>{option.icon}</div>
                <h3>{option.title}</h3>
                <p>{option.desc}</p>
                <span className={styles.availability}>{option.available}</span>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className={styles.faqSection}>
            <h2>Frequently Asked Questions</h2>
            
            {/* Category Filter */}
            <div className={styles.categoryFilter}>
              <button 
                className={activeCategory === 'all' ? styles.active : ''}
                onClick={() => setActiveCategory('all')}
              >
                All Topics
              </button>
              <button 
                className={activeCategory === 'account' ? styles.active : ''}
                onClick={() => setActiveCategory('account')}
              >
                Account
              </button>
              <button 
                className={activeCategory === 'transfers' ? styles.active : ''}
                onClick={() => setActiveCategory('transfers')}
              >
                Transfers
              </button>
              <button 
                className={activeCategory === 'security' ? styles.active : ''}
                onClick={() => setActiveCategory('security')}
              >
                Security
              </button>
            </div>

            {/* FAQ Items */}
            <div className={styles.faqGrid}>
              {faqs
                .filter(cat => activeCategory === 'all' || cat.category.toLowerCase() === activeCategory)
                .map((category, catIdx) => (
                  <div key={catIdx} className={styles.faqCategory}>
                    <h3>{category.category}</h3>
                    {category.questions.map((item, idx) => (
                      <details key={idx} className={styles.faqItem}>
                        <summary>{item.q}</summary>
                        <p>{item.a}</p>
                      </details>
                    ))}
                  </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className={styles.quickLinks}>
            <h2>Quick Links</h2>
            <div className={styles.linksGrid}>
              <a href="#" className={styles.linkCard}>
                <span>📱</span>
                <div>
                  <h4>Mobile App Guide</h4>
                  <p>Learn how to use our mobile app</p>
                </div>
              </a>
              <a href="#" className={styles.linkCard}>
                <span>🔒</span>
                <div>
                  <h4>Security Center</h4>
                  <p>Protect your account</p>
                </div>
              </a>
              <a href="#" className={styles.linkCard}>
                <span>💳</span>
                <div>
                  <h4>Card Services</h4>
                  <p>Manage your cards</p>
                </div>
              </a>
              <a href="#" className={styles.linkCard}>
                <span>📊</span>
                <div>
                  <h4>Investment Help</h4>
                  <p>Portfolio assistance</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}