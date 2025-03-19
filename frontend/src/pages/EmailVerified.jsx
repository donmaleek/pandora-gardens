import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const EmailVerified = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const success = searchParams.get('success') === 'true';
    const error = searchParams.get('error');

    const timer = setTimeout(() => {
      navigate(success ? '/login' : '/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {searchParams.get('success') === 'true' ? (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">
              ✅ Email Verified Successfully!
            </h1>
            <p className="text-gray-600">
              You will be redirected to the login page shortly...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              ⚠️ Verification Failed
            </h1>
            <p className="text-gray-600 mb-4">
              {searchParams.get('error') || 'Invalid verification link'}
            </p>
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Return Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerified;