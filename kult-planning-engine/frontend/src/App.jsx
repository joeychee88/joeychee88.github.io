import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Critical pages - load immediately
import Login from './pages/Login';
import Auth from './pages/Auth';

// Lazy load everything else
const VerifyMagicLink = lazy(() => import('./pages/VerifyMagicLink'));
const RoleDashboardRedirect = lazy(() => import('./pages/RoleDashboardRedirect'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BuildPlan = lazy(() => import('./pages/BuildPlan'));
const BuildPlanWizard = lazy(() => import('./pages/BuildPlanWizard'));
const CampaignPlans = lazy(() => import('./pages/CampaignPlans'));
const AudienceSegments = lazy(() => import('./pages/AudienceSegments'));
const AIWizard = lazy(() => import('./pages/AIWizard'));
const FeedbackAnalytics = lazy(() => import('./pages/FeedbackAnalytics'));
const UploadBrief = lazy(() => import('./pages/UploadBrief'));
const AdminFormat = lazy(() => import('./pages/admin/Format'));
const AdminTargeting = lazy(() => import('./pages/admin/Targeting'));
const AdminSite = lazy(() => import('./pages/admin/Site'));
const AdminRate = lazy(() => import('./pages/admin/Rate'));
const AdminAudience = lazy(() => import('./pages/admin/Audience'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const ClientAdminDashboard = lazy(() => import('./pages/client/ClientAdminDashboard'));
const TeamMemberDashboard = lazy(() => import('./pages/client/TeamMemberDashboard'));
const SalesPersonDashboard = lazy(() => import('./pages/sales/SalesPersonDashboard'));
const SystemAdminPanel = lazy(() => import('./pages/admin/SystemAdminPanel'));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0A0E1A',
    color: '#94A3B8',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #1E293B',
        borderTop: '4px solid #06B6D4',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <div>Loading...</div>
    </div>
  </div>
);

// Prefetch hook - preload pages in the background
const usePrefetch = () => {
  useEffect(() => {
    // Wait 2 seconds after initial load, then prefetch common pages
    const timer = setTimeout(() => {
      console.log('🚀 Prefetching common pages...');
      
      // Prefetch in order of importance
      // These will download in the background while user is idle
      
      // Most common pages first
      import('./pages/Dashboard');
      import('./pages/AIWizard');
      import('./pages/BuildPlanWizard');
      import('./pages/CampaignPlans');
      import('./pages/AudienceSegments');
      
      // Admin pages (if user needs them)
      setTimeout(() => {
        import('./pages/admin/Audience');
        import('./pages/admin/Site');
        import('./pages/admin/Format');
      }, 2000); // Delay admin pages by 2 more seconds
      
      console.log('✅ Prefetch initiated');
    }, 2000); // Start prefetching 2 seconds after page load
    
    return () => clearTimeout(timer);
  }, []);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Prefetch common pages in the background
  usePrefetch();

  useEffect(() => {
    // Check initial auth state
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);

    // Listen for logout events (when token is removed)
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };

    // Listen to storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab logout
    window.addEventListener('logout', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logout', handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E1A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E5CC] mx-auto"></div>
          <p className="mt-4 text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Passwordless Auth Routes */}
        <Route 
          path="/auth" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Auth />
          } 
        />
        <Route 
          path="/auth/verify" 
          element={<VerifyMagicLink />} 
        />
        
        {/* Legacy Password Login */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        
        {/* Home / Dashboard */}
        <Route 
          path="/home" 
          element={
            isAuthenticated ? 
              <Dashboard /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        {/* Dashboard redirect - redirects based on role */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? 
              <RoleDashboardRedirect /> : 
              <Navigate to="/auth" replace />
          }
        />
        
        {/* Client Admin Dashboard */}
        <Route 
          path="/dashboard/client-admin" 
          element={
            isAuthenticated ? 
              <ClientAdminDashboard /> : 
              <Navigate to="/auth" replace />
          }
        />
        
        {/* Team Member Dashboard */}
        <Route 
          path="/dashboard/team-member" 
          element={
            isAuthenticated ? 
              <TeamMemberDashboard /> : 
              <Navigate to="/auth" replace />
          }
        />
        
        {/* Sales Person Dashboard */}
        <Route 
          path="/dashboard/sales" 
          element={
            isAuthenticated ? 
              <SalesPersonDashboard /> : 
              <Navigate to="/auth" replace />
          }
        />
        
        {/* System Admin Panel */}
        <Route 
          path="/dashboard/admin" 
          element={
            isAuthenticated ? 
              <SystemAdminPanel /> : 
              <Navigate to="/auth" replace />
          }
        />
        <Route 
          path="/build-plan" 
          element={
            isAuthenticated ? 
              <BuildPlanWizard /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/build-plan-old" 
          element={
            isAuthenticated ? 
              <BuildPlan /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/campaigns" 
          element={
            isAuthenticated ? 
              <CampaignPlans /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/audience-segments" 
          element={
            isAuthenticated ? 
              <AudienceSegments /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/build-plan-wizard" 
          element={
            isAuthenticated ? 
              <BuildPlanWizard /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/audience" 
          element={
            isAuthenticated ? 
              <AdminAudience /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/targeting" 
          element={
            isAuthenticated ? 
              <AdminTargeting /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/site" 
          element={
            isAuthenticated ? 
              <AdminSite /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/formats" 
          element={
            isAuthenticated ? 
              <AdminFormat /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/rate" 
          element={
            isAuthenticated ? 
              <AdminRate /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/ai-wizard" 
          element={
            isAuthenticated ? 
              <AIWizard /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/admin/ai-learning" 
          element={
            isAuthenticated ? 
              <FeedbackAnalytics /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/upload-brief" 
          element={
            isAuthenticated ? 
              <UploadBrief /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to="/dashboard" replace />} 
        />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
