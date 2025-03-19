import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ClipLoader } from "react-spinners";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // 🔥 Added missing import

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // 🔥 Added navigation hook

  // 🔥 Updated authorization check
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken'); // 🔥 Updated token key
        const response = await axios.get('http://localhost:5000/api/v1/auth/me', { // 🔥 Updated endpoint
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      } catch (err) {
        // 🔥 Enhanced error handling
        if (err.response?.status === 401) {
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          navigate('/login');
        }
        setMessage(err.response?.data?.message || 'Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]); // 🔥 Added navigate dependency

  const handleSendVerificationEmail = async () => {
    try {
      setIsVerifyingEmail(true);
      await axios.post('http://localhost:5000/api/v1/auth/send-verification', {}, { // 🔥 Updated endpoint
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, // 🔥 Updated token key
      });
      setMessage('Verification email sent! Check your inbox.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handle2FAVerification = async () => {
    try {
      await axios.post('http://localhost:5000/api/v1/auth/verify-2fa', { code: verificationCode }, { // 🔥 Updated endpoint
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, // 🔥 Updated token key
      });
      setIs2FAModalOpen(false);
      setMessage('2FA verification successful!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Invalid 2FA code. Try again.');
    }
  };

  // 🔥 Added logout handler
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <ClipLoader color="#3B82F6" size={40} />
        </div>
      ) : user ? (
        <motion.div className="bg-white shadow-lg rounded-lg overflow-hidden" 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}>
          
          {/* Profile Header */}
          <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-center">
            <h2 className="text-2xl font-semibold">{user.name}</h2>
            <p className="text-sm">{user.email}</p>
            {!user.isEmailVerified && (
              <p className="text-red-300 mt-2">
                {isVerifyingEmail ? 'Sending verification...' : (
                  <>
                    Email not verified. 
                    <button onClick={handleSendVerificationEmail} 
                      className="text-yellow-300 underline ml-1">
                      Verify Now
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* User Details Section */}
          <div className="p-6">
            {message && <p className="text-green-600 text-center">{message}</p>}
            <p className="text-gray-600">📞 Phone: {user.phone}</p>
            <p className="text-gray-600">📍 Location: {user.location || 'Not provided'}</p>
            <p className="text-gray-600">📄 Bio: {user.bio || 'No bio available'}</p>

            <div className="mt-6 flex gap-4">
              <button onClick={() => setIs2FAModalOpen(true)} 
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                Enable 2FA
              </button>
              
              {/* 🔥 Added logout button */}
              <button onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <p className="text-center text-red-500">Failed to load profile.</p>
      )}

      {/* 2FA Modal */}
      <AnimatePresence>
        {is2FAModalOpen && (
          <motion.div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}>
            <motion.div className="bg-white p-6 rounded-lg w-96 shadow-lg" 
              initial={{ y: 50 }} 
              animate={{ y: 0 }}>
              <h2 className="text-xl font-bold mb-4">Enter 2FA Code</h2>
              <input 
                type="text" 
                value={verificationCode} 
                onChange={(e) => setVerificationCode(e.target.value)} 
                placeholder="Enter 6-digit code" 
                className="w-full border p-2 rounded mb-2" 
              />
              <button onClick={handle2FAVerification} 
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                Verify
              </button>
              <button onClick={() => setIs2FAModalOpen(false)} 
                className="ml-2 text-gray-500">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;