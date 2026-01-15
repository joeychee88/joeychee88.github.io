import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';

function TeamMemberDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    booked: 0
  });

  useEffect(() => {
    loadUser();
    loadMyCampaigns();
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

  const loadMyCampaigns = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      const response = await axios.get('/api/campaign-workflow/my-campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const myCampaigns = response.data.campaigns || [];
      setCampaigns(myCampaigns);

      // Calculate stats
      const stats = {
        total: myCampaigns.length,
        draft: myCampaigns.filter(c => c.status === 'draft').length,
        pending: myCampaigns.filter(c => c.status === 'pending_approval').length,
        approved: myCampaigns.filter(c => c.status === 'approved').length,
        booked: myCampaigns.filter(c => c.status === 'booked').length
      };
      setStats(stats);

    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (campaignId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/campaign-workflow/${campaignId}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Campaign submitted for approval!');
      loadMyCampaigns();
    } catch (error) {
      console.error('Failed to submit campaign:', error);
      alert('Failed to submit campaign');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-600', text: 'Draft', icon: 'edit' },
      pending_approval: { bg: 'bg-yellow-600', text: 'Pending Review', icon: 'clock' },
      approved: { bg: 'bg-green-600', text: 'Approved', icon: 'check-circle' },
      rejected: { bg: 'bg-red-600', text: 'Rejected', icon: 'x-circle' },
      booked: { bg: 'bg-blue-600', text: 'Booked', icon: 'calendar' },
      in_progress: { bg: 'bg-purple-600', text: 'In Progress', icon: 'trending-up' },
      live: { bg: 'bg-cyan-600', text: 'Live', icon: 'activity' },
      completed: { bg: 'bg-gray-500', text: 'Completed', icon: 'check' }
    };

    const getIcon = (iconName) => {
      const icons = {
        'edit': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        'clock': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        'check-circle': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        'x-circle': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        'calendar': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        'trending-up': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
        'activity': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        'check': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      };
      return icons[iconName] || icons['edit'];
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${config.bg} flex items-center gap-1`}>
        {getIcon(config.icon)}
        <span>{config.text}</span>
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

  const getCampaignActions = (campaign) => {
    const actions = [];

    if (campaign.status === 'draft') {
      actions.push(
        <button
          key="edit"
          onClick={() => navigate(`/build-plan-wizard?id=${campaign.id}`)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
        >
          ✏️ Continue Editing
        </button>
      );
      actions.push(
        <button
          key="submit"
          onClick={() => handleSubmitForApproval(campaign.id)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Submit for Approval
        </button>
      );
    }

    if (campaign.status === 'rejected') {
      actions.push(
        <button
          key="edit"
          onClick={() => navigate(`/build-plan-wizard?id=${campaign.id}`)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
        >
          ✏️ Revise & Resubmit
        </button>
      );
    }

    actions.push(
      <button
        key="view"
        onClick={() => navigate(`/campaigns/${campaign.id}`)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
      >
        👁️ View Details
      </button>
    );

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Campaigns</h1>
          <p className="text-gray-400">Create and manage your campaign plans</p>
        </div>
        <button
          onClick={() => navigate('/build-plan-wizard')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Campaign</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Draft</p>
              <p className="text-3xl font-bold text-gray-400">{stats.draft}</p>
            </div>
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">All Campaigns</h2>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-cyan-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-400 mb-6">Create your first campaign to get started</p>
            <button
              onClick={() => navigate('/build-plan-wizard')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
              <span>Create Campaign</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-5 hover:border-cyan-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">
                        {campaign.campaignName || 'Untitled Campaign'}
                      </h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {campaign.advertiserName} • {campaign.objective} • {campaign.industry?.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Budget: <span className="text-white font-medium">{formatCurrency(campaign.totalBudget || 0)}</span>
                      </span>
                      <span className="text-gray-400">
                        Created: <span className="text-white">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                      </span>
                      {campaign.status === 'pending_approval' && campaign.workflow?.submittedAt && (
                        <span className="text-yellow-400">
                          Submitted: {new Date(campaign.workflow.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                      {campaign.status === 'rejected' && campaign.workflow?.rejectionReason && (
                        <span className="text-red-400">
                          Reason: {campaign.workflow.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {getCampaignActions(campaign)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>Campaign Workflow</span>
        </h3>
        <div className="text-gray-300 text-sm space-y-2">
          <p>1. <strong>Create</strong> a new campaign using the wizard</p>
          <p>2. <strong>Submit</strong> for approval when ready</p>
          <p>3. <strong>Client Admin</strong> will review and approve/reject</p>
          <p>4. Once approved, admin will <strong>Book</strong> the campaign</p>
          <p>5. Our sales team will be notified and follow up with you</p>
        </div>
      </div>
    </div>
    </Layout>
  );
}

export default TeamMemberDashboard;
