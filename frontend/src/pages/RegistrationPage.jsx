import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import house1 from '../assets/pandora-21.jpeg';
import house2 from '../assets/pandora-22.jpeg';
import house3 from '../assets/pandora-23.jpeg';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.match(/^.{2,50}$/)) newErrors.name = 'Name must be 2-50 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    // 🔥 Changed phone validation to match backend
    if (!/^(\+?\d{1,4}[-.\s]?)?(\d{7,15})$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    if (formData.password.length < 8) newErrors.password = 'Password must be 8+ characters';
    
    // 🔥 Updated role validation to match User model enum
    if (!['tenant', 'landlord', 'agent', 'admin'].includes(formData.role)) {
      newErrors.role = 'Please select a valid role';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        setStatusMessage({ text: `⚠️ ${data.message || 'Registration failed.'}`, type: 'error' });
        return;
      }
      setStatusMessage({ text: '✅ Registration successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setStatusMessage({ text: '⚠️ Server error. Please try again later.', type: 'error' });
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
    arrows: false
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-wrap w-full max-w-6xl bg-gray-50 rounded-2xl shadow-2xl overflow-hidden mx-4">
        
        {/* Image Carousel */}
        <div className="hidden md:block w-1/2 relative mt-[55px] p-[10px] rounded-[20px]">
          <Slider {...settings} className="h-full">
            {[house1, house2, house3].map((img, index) => (
              <div 
                key={index} 
                className="h-[600px] flex items-center justify-center relative"
              >
                <img 
                  src={img} 
                  alt={`House ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            ))}
          </Slider>
        </div>

        {/* Registration Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-gray-50">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
              Create Account
              <span className="block mt-2 text-sm font-normal text-gray-500">
                Join our community today
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name, Email, Phone */}
              {[
                { label: 'Full Name', type: 'text', name: 'name' }, 
                { label: 'Email', type: 'email', name: 'email' }, 
                { label: 'Phone', type: 'tel', name: 'phone' }
              ].map(({ label, type, name }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  <input 
                    type={type} 
                    name={name} 
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={formData[name]} 
                    onChange={(e) => setFormData({ ...formData, [name]: e.target.value })} 
                  />
                  {errors[name] && <p className="text-red-600 text-xs mt-1.5">{errors[name]}</p>}
                </div>
              ))}

              {/* Role Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  name="role"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="">-- Select Role --</option>
                  <option value="tenant">Tenant</option>
                  <option value="landlord">Landlord</option>
                  <option value="agent">Agent</option>
                </select>
                {errors.role && <p className="text-red-600 text-xs mt-1.5">{errors.role}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
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

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg">
                Create Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;