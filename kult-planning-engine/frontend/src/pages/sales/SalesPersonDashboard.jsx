import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';

function SalesPersonDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalCampaigns: 0,
    bookedCampaigns: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadUser();
    loadSalesDashboard();
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/login');
    }
  };

  const loadSalesDashboard = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);

      // Load my assigned organizations (clients)
      const orgsResponse = await axios.get('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter organizations assigned to this sales person
      const myClients = (orgsResponse.data.organizations || []).filter(
        org => org.assignedSalesPersonId === user.id
      );

      setClients(myClients);

      // Load all campaigns for my clients
      const campaignsResponse = await axios.get('/api/campaign-workflow/my-campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allCampaigns = campaignsResponse.data.campaigns || [];
      
      // Filter campaigns for my clients
      const myCampaigns = allCampaigns.filter(campaign =>
        myClients.some(client => client.id === campaign.organizationId)
      );

      setCampaigns(myCampaigns);

      // Calculate stats
      const bookedCampaigns = myCampaigns.filter(c => 
        c.status === 'booked' || c.status === 'in_progress' || c.status === 'live'
      );
      
      const totalRevenue = bookedCampaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0);

      setStats({
        totalClients: myClients.length,
        totalCampaigns: myCampaigns.length,
        bookedCampaigns: bookedCampaigns.length,
        totalRevenue
      });

    } catch (error) {
      console.error('Failed to load sales dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-600', text: 'Draft' },
      pending_approval: { bg: 'bg-yellow-600', text: 'Pending' },
      approved: { bg: 'bg-green-600', text: 'Approved' },
      rejected: { bg: 'bg-red-600', text: 'Rejected' },
      booked: { bg: 'bg-blue-600', text: 'Booked' },
      in_progress: { bg: 'bg-purple-600', text: 'In Progress' },
      live: { bg: 'bg-cyan-600', text: 'Live' },
      completed: { bg: 'bg-gray-500', text: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${config.bg}`}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getClientCampaigns = (clientId) => {
    return campaigns.filter(c => c.organizationId === clientId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Sales Dashboard</h1>
        <p className="text-gray-400">Manage your clients and campaign bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">My Clients</p>
              <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
            </div>
            <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Campaigns</p>
              <p className="text-3xl font-bold text-white">{stats.totalCampaigns}</p>
            </div>
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Booked</p>
              <p className="text-3xl font-bold text-blue-400">{stats.bookedCampaigns}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* My Clients */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>My Clients</span>
        </h2>

        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No clients assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const clientCampaigns = getClientCampaigns(client.id);
              const bookedCount = clientCampaigns.filter(c => 
                c.status === 'booked' || c.status === 'in_progress' || c.status === 'live'
              ).length;

              return (
                <div
                  key={client.id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-5 hover:border-cyan-500 transition-all cursor-pointer"
                  onClick={() => navigate(`/sales/client/${client.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">{client.name}</h3>
                      <p className="text-gray-400 text-sm capitalize">{client.industry?.replace('_', ' ')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      client.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                    }`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Admin:</span>
                      <span className="text-white">{client.adminName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Team Size:</span>
                      <span className="text-white">{client.teamMembers?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Campaigns:</span>
                      <span className="text-white">{clientCampaigns.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Booked:</span>
                      <span className="text-blue-400 font-semibold">{bookedCount}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${client.adminEmail}`;
                      }}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      📧 Contact Admin
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📅</span>
          <span>Recent Campaign Bookings</span>
        </h2>

        {campaigns.filter(c => c.status === 'booked' || c.status === 'in_progress' || c.status === 'live').length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No booked campaigns yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns
              .filter(c => c.status === 'booked' || c.status === 'in_progress' || c.status === 'live')
              .sort((a, b) => new Date(b.workflow?.bookedAt || 0) - new Date(a.workflow?.bookedAt || 0))
              .slice(0, 10)
              .map((campaign) => {
                const client = clients.find(c => c.id === campaign.organizationId);

                return (
                  <div
                    key={campaign.id}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold">
                            {campaign.campaignName || 'Untitled Campaign'}
                          </h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          {client?.name} • {campaign.advertiserName} • {campaign.objective}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            Budget: <span className="text-white font-medium">{formatCurrency(campaign.totalBudget || 0)}</span>
                          </span>
                          {campaign.workflow?.bookedAt && (
                            <span className="text-gray-400">
                              Booked: <span className="text-blue-400">{new Date(campaign.workflow.bookedAt).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                          👁️ View
                        </button>
                        {client && (
                          <button
                            onClick={() => window.location.href = `mailto:${client.adminEmail}`}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                          >
                            📧 Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* All Campaigns */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>All Client Campaigns</span>
        </h2>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No campaigns yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((campaign) => {
                const client = clients.find(c => c.id === campaign.organizationId);

                return (
                  <div
                    key={campaign.id}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold">
                            {campaign.campaignName || 'Untitled Campaign'}
                          </h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          {client?.name} • {campaign.advertiserName}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            Budget: <span className="text-white">{formatCurrency(campaign.totalBudget || 0)}</span>
                          </span>
                          <span className="text-gray-400">
                            Created: {new Date(campaign.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        👁️ View
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}

export default SalesPersonDashboard;
