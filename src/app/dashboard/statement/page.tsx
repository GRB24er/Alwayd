'use client';
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";

import { useEffect, useState } from 'react';

export default function StatementPage() {
  const { format } = useDisplayCurrency();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const res = await fetch(`/api/transactions/statement?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      const json = await res.json();
      setData(json);
    };

    fetchData();
  }, []);

  if (!data) return <p>Loading statement...</p>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Segoe UI' }}>
      <h2>Monthly Statement</h2>
      <p><strong>Name:</strong> {data.user.name}</p>
      <p><strong>Email:</strong> {data.user.email}</p>
      <p><strong>Account Number:</strong> {data.user.accountNumber}</p>
      <p><strong>Period:</strong> {data.period.start} – {data.period.end}</p>

      <h4 style={{ marginTop: '20px' }}>Summary</h4>
      <ul>
        <li>Total Inflow: ${data.inflow.toFixed(2)}</li>
        <li>Total Outflow: ${data.outflow.toFixed(2)}</li>
        <li>Ending Balance: ${data.user.balance.toFixed(2)}</li>
      </ul>

      <h4 style={{ marginTop: '30px' }}>Transactions</h4>
      <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((t: any, i: number) => (
            <tr key={i}>
              <td>{new Date(t.date).toLocaleString()}</td>
              <td>{t.type}</td>
              <td>{t.description}</td>
              <td>{t.amount >= 0 ? '+' : '-'}{format(Math.abs(t.amount))}</td>
              <td>{t.status}</td>
              <td>{format(t.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => window.print()}
        style={{ marginTop: '30px', padding: '10px 20px', fontSize: '16px' }}
      >
        🖨️ Print / Save as PDF
      </button>
    </div>
  );
}
