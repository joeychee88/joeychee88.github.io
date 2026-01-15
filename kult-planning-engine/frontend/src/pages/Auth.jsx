import React, { useState } from 'react';
import axios from 'axios';

function Auth() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup' 
        ? { email, name, company, phone, industry }
        : { email };

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        setSuccess(true);
        setPreviewUrl(response.data.previewUrl); // For development - shows email preview
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    { value: 'fmcg', label: 'FMCG' },
    { value: 'beauty', label: 'Beauty & Cosmetics' },
    { value: 'automotive_ice', label: 'Automotive (ICE)' },
    { value: 'automotive_ev', label: 'Automotive (EV)' },
    { value: 'tech_devices', label: 'Tech & Devices' },
    { value: 'banking_fintech', label: 'Banking / Fintech' },
    { value: 'retail_ecommerce', label: 'Retail / eCommerce' },
    { value: 'property_luxury', label: 'Property (Luxury)' },
    { value: 'telco', label: 'Telco' },
    { value: 'tourism', label: 'Tourism' },
    { value: 'education', label: 'Education' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'f_and_b', label: 'F&B' }
  ];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
          }}></div>
        </div>

        <div className="max-w-md w-full space-y-8 p-8 relative z-10">
          <div className="bg-[#0f1419] border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-900/20 border border-green-700 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-white mb-2">
              Check Your Email! 📧
            </h2>
            <p className="text-gray-400 mb-6">
              We've sent a magic link to <span className="text-cyan-400 font-semibold">{email}</span>
            </p>

            <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-cyan-300">
                Click the link in your email to {mode === 'signup' ? 'complete your registration' : 'log in'}. 
                The link expires in <strong>15 minutes</strong>.
              </p>
            </div>

            {/* Development Preview Link */}
            {previewUrl && (
              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 mb-4">
                <p className="text-xs text-purple-300 mb-2">
                  🛠️ <strong>Development Mode:</strong> Preview your email
                </p>
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 underline break-all"
                >
                  {previewUrl}
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
                setName('');
                setCompany('');
                setPhone('');
                setIndustry('');
              }}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              ← Back to {mode === 'signup' ? 'sign up' : 'login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Card Container */}
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo Section */}
          <div className="flex justify-center mb-3">
            <img 
              src="/kult-logo.png" 
              alt="KULT" 
              className="h-12 w-auto"
              style={{ filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.4)) drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))' }}
            />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-gray-400">
              {mode === 'signup' 
                ? 'Get started with KULT Planning Engine' 
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-[#1a1f2e] rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="you@company.com"
              />
            </div>

            {/* Signup-only fields */}
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="+60123456789"
                  />
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-2">
                    Industry
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select industry...</option>
                    {industries.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending magic link...
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-gray-400">
                <strong className="text-cyan-300">No password needed!</strong>
                <p className="mt-1">
                  We'll send a secure magic link to your email. Click it to {mode === 'signup' ? 'create your account' : 'log in'} instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
