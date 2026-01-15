import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch custom event so App.jsx updates isAuthenticated
    window.dispatchEvent(new Event('logout'));
    
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    // If currently on Build Plan page and navigating to Build Plan, show confirm dialog
    if (location.pathname === '/build-plan' && path === '/build-plan') {
      setPendingPath(path);
      setShowNavigationConfirm(true);
    } else {
      navigate(path);
    }
  };

  const confirmNavigation = (shouldSave) => {
    setShowNavigationConfirm(false);
    
    if (shouldSave) {
      // Dispatch event to trigger save in BuildPlanWizard
      window.dispatchEvent(new CustomEvent('saveDraftAndReset'));
    } else {
      // Just reset and navigate
      window.dispatchEvent(new CustomEvent('resetBuildPlan'));
    }
    
    setPendingPath(null);
  };

  // Prefetch pages on hover for instant navigation
  const prefetchPage = (path) => {
    const prefetchMap = {
      '/home': () => import('../pages/Dashboard'),
      '/ai-wizard': () => import('../pages/AIWizard'),
      '/build-plan': () => import('../pages/BuildPlanWizard'),
      '/campaigns': () => import('../pages/CampaignPlans'),
      '/audience-segments': () => import('../pages/AudienceSegments'),
      '/admin/audience': () => import('../pages/admin/Audience'),
      '/admin/site': () => import('../pages/admin/Site'),
      '/admin/formats': () => import('../pages/admin/Format'),
      '/admin/targeting': () => import('../pages/admin/Targeting'),
      '/admin/rate': () => import('../pages/admin/Rate'),
      '/admin/ai-learning': () => import('../pages/FeedbackAnalytics'),
      '/dashboard/admin': () => import('../pages/admin/SystemAdminPanel'),
    };

    if (prefetchMap[path]) {
      prefetchMap[path]().catch(() => {
        // Silently ignore prefetch errors
      });
    }
  };

  // Helper function to render icons with conditional sizing
  const renderIcon = (pathData) => {
    const iconSize = isCollapsed ? 'w-7 h-7' : 'w-5 h-5';
    return (
      <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={pathData} />
      </svg>
    );
  };

  const menuItems = [
    { 
      path: '/home', 
      label: 'Home', 
      iconPath: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    },
    { 
      path: '/ai-wizard', 
      label: 'AI Campaign Wizard', 
      iconPath: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      badge: 'AI'
    },
    { 
      path: '/build-plan', 
      label: 'Build Your Plan', 
      iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    },
    { 
      path: '/campaigns', 
      label: 'Campaign Plans', 
      iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    },
    { 
      path: '/audience-segments', 
      label: 'Audience Segment', 
      iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    }
  ];

  const adminItems = [
    { 
      path: '/admin/audience', 
      label: 'Audience', 
      iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    },
    { 
      path: '/admin/site', 
      label: 'Inventory', 
      iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    },
    { 
      path: '/admin/formats', 
      label: 'Format', 
      iconPath: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
    },
    { 
      path: '/admin/targeting', 
      label: 'Targeting', 
      iconPath: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    },
    { 
      path: '/admin/rate', 
      label: 'Rate', 
      iconPath: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      path: '/admin/ai-learning', 
      label: 'AI Learning', 
      iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      badge: 'Analytics'
    },
    { 
      path: '/dashboard/admin', 
      label: 'User', 
      iconPath: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    }
  ];

  return (
    <div className="flex h-screen bg-[#0A0E1A] overflow-hidden">
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`bg-[#121827] border-r border-[#1E293B] flex flex-col sidebar-transition fixed lg:relative h-full z-50 ${
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
        }`}
      >
        {/* Logo & Toggle - Brand Hierarchy: KULT Primary, Planning Engine Secondary */}
        <div className="p-6 border-b border-[#1E293B]">
          {!isCollapsed ? (
            <div className="flex flex-col">
              {/* Brand Identity Block */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col items-start">
                  {/* KULT Logo - Primary Brand Asset */}
                  <img 
                    src="/kult-logo.png" 
                    alt="KULT"
                    loading="eager"
                    decoding="async"
                    className="h-12 w-auto object-contain mb-2"
                    style={{ 
                      filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.3)) drop-shadow(0 0 8px rgba(168, 85, 247, 0.2))'
                    }}
                  />
                  {/* Planning Engine - Supporting Descriptor, left-aligned with logo edge */}
                  <div className="text-[#94A3B8] text-sm font-normal tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Planning Engine
                  </div>
                </div>
                {/* Collapse Toggle */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-[#94A3B8] hover:text-white transition-colors flex-shrink-0 mt-1"
                >
                  <svg 
                    className="w-5 h-5 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full space-y-3">
              {/* Expand Toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <svg 
                  className="w-5 h-5 transition-transform rotate-180" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              {/* Collapsed Logo - Show only "K" letter */}
              <div 
                className="text-white text-2xl font-black"
                style={{ 
                  fontFamily: 'Inter, sans-serif',
                  filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))'
                }}
              >
                K
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              onMouseEnter={() => prefetchPage(item.path)}
              className={`kult-sidebar-item ${isActive(item.path) ? 'active' : ''} ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? item.label : ''}
            >
              {renderIcon(item.iconPath)}
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded uppercase">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </div>
          ))}

          {/* Admin Section */}
          {!isCollapsed && (
            <div className="pt-6 pb-2">
              <div className="px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                [ ADMIN ]
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <div className="pt-6 pb-2">
              <div className="w-full h-px bg-[#1E293B]"></div>
            </div>
          )}

          {adminItems.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => prefetchPage(item.path)}
              className={`kult-sidebar-item ${isActive(item.path) ? 'active' : ''} ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? item.label : ''}
            >
              {renderIcon(item.iconPath)}
              {!isCollapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#1E293B]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-2 text-sm text-[#94A3B8] hover:text-white transition-colors ${
              isCollapsed ? 'justify-center' : 'justify-center'
            }`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <svg className={isCollapsed ? 'w-7 h-7' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full bg-[#0A0E1A]">
        {/* Top Header Bar with User Profile */}
        <div className="bg-[#121827] border-b border-[#1E293B] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="lg:hidden text-gray-400 hover:text-white mr-4"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Title/Breadcrumb - Optional, can be empty */}
          <div className="flex-1"></div>
          
          {/* User Profile Section */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{user.name || 'User'}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {user.role === 'system_admin' ? 'System Admin' : 
                     user.role === 'client_admin' ? 'Client Admin' :
                     user.role === 'client_user' ? 'Team Member' :
                     user.role === 'sales_person' ? 'Sales Person' : user.role}
                  </div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </>
            )}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <svg className={isCollapsed ? 'w-7 h-7' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        {children}
      </main>

      {/* Navigation Confirmation Modal */}
      {showNavigationConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Start New Campaign?</h3>
            <p className="text-gray-300 mb-6">
              You're about to start a new campaign plan. Would you like to save your current progress as a draft first?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmNavigation(true)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Save & Start New
              </button>
              <button
                onClick={() => confirmNavigation(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Start Without Saving
              </button>
              <button
                onClick={() => setShowNavigationConfirm(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
