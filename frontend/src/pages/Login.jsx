import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import house1 from '../assets/Pandora_swahili_st.jpeg';
import house2 from '../assets/pandora-3.png';
import house3 from '../assets/pandora-4.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setStatusMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatusMessage({ text: data?.message || 'Login failed', type: 'error' });
        return;
      }

      // Store token in both localStorage and sessionStorage
      localStorage.setItem('authToken', data.token);
      sessionStorage.setItem('authToken', data.token);

      setStatusMessage({ text: '✅ Login successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      setStatusMessage({ text: '⚠️ Server error. Please try again later.', type: 'error' });
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setStatusMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatusMessage({ text: data?.message || 'Password reset failed', type: 'error' });
        return;
      }

      setStatusMessage({ text: '📩 Password reset link sent to your email', type: 'success' });
      setShowResetForm(false);
    } catch (error) {
      setStatusMessage({ text: '⚠️ Error sending reset link', type: 'error' });
    }
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: false,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="flex flex-wrap w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Image Slider Section */}
        <div className="hidden md:block w-1/2 bg-black">
          <Slider {...settings}>
            {[house1, house2, house3].map((img, index) => (
              <div key={index} className="h-[600px] flex items-center justify-center relative">
                <img 
                  src={img} 
                  alt={`House ${index + 1}`} 
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            ))}
          </Slider>
        </div>

        {/* Login Form Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-gray-50">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
              Welcome Back
              <span className="block mt-2 text-sm font-normal text-gray-500">
                Sign in to your account
              </span>
            </h1>

            {statusMessage.text && (
              <div className={`p-3 text-center rounded-lg mb-6 text-sm ${
                statusMessage.type === 'error' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {statusMessage.text}
              </div>
            )}

            {!showResetForm ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Reset Password</h2>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your registered email"
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
