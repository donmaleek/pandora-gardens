/* ✅ PaymentsDashboard.jsx - Enhanced Version */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { TailSpin } from 'react-loader-spinner';

/*
  Component to display a status badge based on payment status.
  - 'Completed' -> Green badge
  - 'Pending' -> Yellow badge
  - 'Failed' -> Red badge
*/
const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
      status === 'Completed'
        ? 'bg-green-100 text-green-800'
        : status === 'Pending'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'
    }`}
  >
    {status}
  </span>
);

/*
  PaymentsDashboard Component
  - Fetches and displays payment history for a given phone number
  - Supports pagination and item limit selection
*/
const PaymentsDashboard = ({ phone }) => {
  // State variables
  const [payments, setPayments] = useState([]); // Stores payment records
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [itemsPerPage, setItemsPerPage] = useState(10); // Items per page
  const [totalItems, setTotalItems] = useState(0); // Total items count

  /*
    Function to fetch payment history from the API
    - Uses axios to fetch data from the backend
    - Implements cancel token to prevent memory leaks
  */
  const fetchPayments = useCallback(
    async (page, limit) => {
      if (!phone) {
        setError('Phone number is required.');
        setLoading(false);
        return;
      }

      const source = axios.CancelToken.source(); // Cancel token to prevent duplicate requests
      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://localhost:5000/api/mpesa/history/${phone}`,
          {
            params: { page, limit },
            cancelToken: source.token,
          }
        );
        setPayments(data.data);
        setTotalItems(data.total);
        setError(null);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError('Failed to load payment history. Please try again later.');
          console.error('Payment history error:', err);
        }
      } finally {
        setLoading(false);
      }

      return () => source.cancel('Request canceled due to component unmount or new request.');
    },
    [phone]
  );

  /*
    Effect Hook to fetch data when phone or itemsPerPage changes.
    - Resets page number to 1 when phone number changes
  */
  useEffect(() => {
    setCurrentPage(1);
    fetchPayments(1, itemsPerPage);
  }, [phone, fetchPayments, itemsPerPage]);

  /*
    Function to handle page changes
    - Updates the current page and fetches new data
  */
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchPayments(newPage, itemsPerPage);
  };

  /*
    Function to format currency in Kenyan Shillings (KES)
  */
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-0">Payment History</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600">Items per page:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              setItemsPerPage(newLimit);
              setCurrentPage(1);
              fetchPayments(1, newLimit);
            }}
            className="px-3 py-2 border rounded-md"
          >
            {[5, 10, 20].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
          <button
            onClick={() => fetchPayments(currentPage, itemsPerPage)}
            className="ml-4 px-3 py-1 bg-red-100 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loader Spinner */}
      {loading ? (
        <div className="flex justify-center py-8">
          <TailSpin color="#3B82F6" height={40} width={40} />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">No payments found for this account</div>
      ) : (
        <>
          {/* Payments Table */}
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Receipt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(parseISO(payment.createdAt), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {payment.mpesaReceiptNumber || '–'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentsDashboard;
