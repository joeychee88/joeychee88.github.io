import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    const loadUserAndRedirect = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        hasRedirected.current = true;
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = response.data.user;
        setUser(userData);
        
        // Mark as redirected before navigating
        hasRedirected.current = true;
        
        // Redirect based on role
        switch (userData.role) {
          case 'system_admin':
            // System admin sees Campaign Plans first
            navigate('/campaigns', { replace: true });
            break;
          case 'sales_person':
            navigate('/dashboard/sales', { replace: true });
            break;
          case 'client_admin':
            navigate('/dashboard/client-admin', { replace: true });
            break;
          case 'client_user':
            navigate('/dashboard/team-member', { replace: true });
            break;
          default:
            // Fallback to campaigns
            navigate('/campaigns', { replace: true });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('token'); // Clear invalid token
        hasRedirected.current = true;
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadUserAndRedirect();
  }, []); // Empty dependency array - only run once

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default Dashboard;
