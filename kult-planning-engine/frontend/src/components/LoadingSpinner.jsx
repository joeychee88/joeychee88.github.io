/**
 * Standard Loading Spinner Component
 * Consistent loading state across the entire dashboard
 */
import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
          {/* Animated arc */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin"></div>
        </div>
        {/* Loading text */}
        <div className="text-gray-400 text-base">{message}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
