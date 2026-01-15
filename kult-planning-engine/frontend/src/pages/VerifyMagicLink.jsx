import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

function VerifyMagicLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setError('No verification token found in URL');
        return;
      }

      try {
        const response = await axios.get(`/api/auth/verify?token=${token}`);
        
        if (response.data.success) {
          // Store JWT token and user info
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          setUser(response.data.user);
          setStatus('success');
          
          // Redirect after 2 seconds
          setTimeout(() => {
            // Redirect based on role
            if (response.data.user.role === 'system_admin') {
              navigate('/admin/dashboard');
            } else if (response.data.user.role === 'sales_person') {
              navigate('/sales/dashboard');
            } else if (response.data.user.role === 'client_admin') {
              navigate('/client/dashboard');
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        }
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.error || 'Verification failed. The link may have expired.');
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
        }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 p-8 relative z-10">
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/kult-logo.png" 
              alt="KULT" 
              className="h-12 w-auto"
              style={{ filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.4)) drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))' }}
            />
          </div>

          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-cyan-900/20 border border-cyan-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Verifying Your Link...
              </h2>
              <p className="text-gray-400">
                Please wait while we verify your magic link.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-900/20 border border-green-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome{user?.name ? `, ${user.name}` : ''}! 🎉
              </h2>
              <p className="text-gray-400 mb-4">
                Your account has been verified successfully.
              </p>
              
              {user && (
                <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4 mb-6">
                  <div className="text-left space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white font-medium">{user.email}</span>
                    </div>
                    {user.organization && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Company:</span>
                        <span className="text-white font-medium">{user.organization.name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Role:</span>
                      <span className="text-cyan-400 font-medium capitalize">
                        {user.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-900/20 border border-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-400 mb-6">
                {error}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-all"
                >
                  Request New Link
                </button>
                
                <p className="text-xs text-gray-500">
                  Magic links expire after 15 minutes for security.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Help Text */}
        {status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:support@kult.my" className="text-cyan-400 hover:text-cyan-300">
                support@kult.my
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyMagicLink;
