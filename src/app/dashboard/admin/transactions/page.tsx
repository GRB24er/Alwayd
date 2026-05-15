"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./transactions.module.css";

interface Transaction {
  _id: string;
  reference: string;
  description: string;
  amount: number;
  status: string;
  date: string;
  accountType: string;
  userId: {
    name: string;
    email: string;
  };
}

export default function AdminTransactionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/admin/transactions");
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/transactions/${id}/approve`, {
        method: "POST"
      });

      if (response.ok) {
        await fetchTransactions();
        alert("Transaction approved successfully!");
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      alert("Failed to approve transaction");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/transactions/${id}/reject`, {
        method: "POST"
      });

      if (response.ok) {
        await fetchTransactions();
        alert("Transaction rejected successfully!");
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      alert("Failed to reject transaction");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <h1>Transaction Approval</h1>
            <p>Review and approve pending transactions</p>
          </div>

          <div className={styles.transactionsTable}>
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>User</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{tx.reference}</td>
                    <td>
                      <div>{tx.userId?.name}</div>
                      <small>{tx.userId?.email}</small>
                    </td>
                    <td>{tx.description}</td>
                    <td className={styles.amount}>
                      ${tx.amount.toLocaleString()}
                    </td>
                    <td>{tx.accountType}</td>
                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`${styles.status} ${styles[tx.status]}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      {tx.status === "pending" && (
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleApprove(tx._id)}
                            disabled={processing === tx._id}
                            className={styles.approveBtn}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(tx._id)}
                            disabled={processing === tx._id}
                            className={styles.rejectBtn}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
