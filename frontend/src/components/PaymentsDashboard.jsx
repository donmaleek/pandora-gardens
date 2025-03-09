// ✅ PaymentsDashboard.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PaymentsDashboard = ({ phone }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch payment history from backend
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/mpesa/history/${phone}`
        );
        setPayments(data);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [phone]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 Payment History</h1>

      {loading ? (
        <p>Loading payments...</p>
      ) : payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <table className="w-full table-auto border-collapse shadow-lg">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="p-3">Date</th>
              <th className="p-3">Amount (Ksh)</th>
              <th className="p-3">Receipt No.</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id} className="border-b">
                <td className="p-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{payment.amount}</td>
                <td className="p-3">{payment.mpesaReceiptNumber || 'Pending'}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-white ${
                      payment.status === 'Completed'
                        ? 'bg-green-500'
                        : payment.status === 'Pending'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PaymentsDashboard;
