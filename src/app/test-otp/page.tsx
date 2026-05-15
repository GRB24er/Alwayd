"use client";

import { useState } from 'react';

export default function TestOTP() {
  const [result, setResult] = useState('');
  const [code, setCode] = useState('');

  const requestOTP = async () => {
    setResult('Sending...');
    const res = await fetch('/api/otp/request', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ type: 'login' })
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
    if (data.code) alert('OTP Code: ' + data.code);
  };

  const verifyOTP = async () => {
    setResult('Verifying...');
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ code, type: 'login' })
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{padding: '2rem', maxWidth: '600px', margin: '0 auto'}}>
      <h1>OTP Test</h1>
      
      <button 
        onClick={requestOTP}
        style={{padding: '1rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px'}}
      >
        Send OTP to Email
      </button>
      
      <div style={{marginTop: '2rem'}}>
        <input 
          type="text"
          placeholder="Enter OTP code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{padding: '1rem', border: '2px solid #d1fae5', borderRadius: '8px', width: '200px', fontSize: '20px'}}
        />
        <button 
          onClick={verifyOTP}
          style={{padding: '1rem 2rem', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginLeft: '1rem', fontSize: '16px'}}
        >
          Verify
        </button>
      </div>
      
      <pre style={{marginTop: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap'}}>
        {result}
      </pre>
      
      <p style={{marginTop: '2rem', color: '#64748b'}}>
        Check email: admin@zentribank.capital
      </p>
    </div>
  );
}