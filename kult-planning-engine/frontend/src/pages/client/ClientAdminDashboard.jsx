import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';

function ClientAdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    booked: 0
  });

  useEffect(() => {
    loadUser();
    loadDashboardData();
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

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);

      // Load all team campaigns
      const campaignsResponse = await axios.get('/api/campaign-workflow/my-campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load pending approvals
      const pendingResponse = await axios.get('/api/campaign-workflow/pending-approval', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allCampaigns = campaignsResponse.data.campaigns || [];
      const pending = pendingResponse.data.campaigns || [];

      setCampaigns(allCampaigns);
      setPendingApprovals(pending);

      // Calculate stats
      const stats = {
        total: allCampaigns.length,
        pending: pending.length,
        approved: allCampaigns.filter(c => c.status === 'approved').length,
        booked: allCampaigns.filter(c => c.status === 'booked').length
      };
      setStats(stats);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCampaign = async (campaignId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/campaign-workflow/${campaignId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Campaign approved successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve campaign:', error);
      alert('Failed to approve campaign');
    }
  };

  const handleRejectCampaign = async (campaignId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/campaign-workflow/${campaignId}/reject`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Campaign rejected');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject campaign:', error);
      alert('Failed to reject campaign');
    }
  };

  const handleBookCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to book this campaign? This will notify the assigned sales person.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/campaign-workflow/${campaignId}/book`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Campaign booked successfully! Sales person has been notified.');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to book campaign:', error);
      alert('Failed to book campaign');
    }
  };

  const handleReassignCampaign = async (campaignId) => {
    const teamMemberEmail = prompt('Enter team member email to reassign to:');
    if (!teamMemberEmail) return;

    const reason = prompt('Reason for reassignment:');
    if (!reason) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/campaign-workflow/${campaignId}/reassign`,
        { newOwnerEmail: teamMemberEmail, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Campaign reassigned successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reassign campaign:', error);
      alert(error.response?.data?.message || 'Failed to reassign campaign');
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
        <h1 className="text-3xl font-bold text-white mb-2">Client Admin Dashboard</h1>
        <p className="text-gray-400">Manage your team's campaigns and approvals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Campaigns</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
            </div>
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Booked</p>
              <p className="text-3xl font-bold text-blue-400">{stats.booked}</p>
            </div>
            <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Pending Approvals</h2>
            <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {pendingApprovals.length} Waiting
            </span>
          </div>

          <div className="space-y-4">
            {pendingApprovals.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {campaign.campaignName || 'Untitled Campaign'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {campaign.advertiserName} • {campaign.industry?.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Budget: <span className="text-white font-medium">{formatCurrency(campaign.totalBudget || 0)}</span>
                      </span>
                      <span className="text-gray-400">
                        Submitted: <span className="text-white">{new Date(campaign.workflow?.submittedAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveCampaign(campaign.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectCampaign(campaign.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                  <button
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Team Campaigns */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">All Team Campaigns</h2>
          <button
            onClick={() => navigate('/build-plan-wizard')}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No campaigns yet</p>
            <button
              onClick={() => navigate('/build-plan-wizard')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
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
                      {campaign.advertiserName} • {campaign.objective}
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

                  <div className="flex gap-2 ml-4">
                    {campaign.status === 'approved' && (
                      <button
                        onClick={() => handleBookCampaign(campaign.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        📅 Book
                      </button>
                    )}
                    {(campaign.status === 'draft' || campaign.status === 'rejected') && (
                      <button
                        onClick={() => navigate(`/build-plan-wizard?id=${campaign.id}`)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleReassignCampaign(campaign.id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      title="Reassign to another team member"
                    >
                      🔄 Reassign
                    </button>
                    <button
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}

export default ClientAdminDashboard;
