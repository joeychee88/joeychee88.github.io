import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCampaigns: 3,
    activeCampaigns: 2,
    totalBudget: 550000,
    allocatedBudget: 550000,
    averageMargin: 28.5,
    totalImpressions: 15000000
  });

  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: 'TechCorp Q1 2024 Brand Campaign',
      client: 'TechCorp Malaysia',
      type: 'Awareness',
      status: 'approved',
      date: '2024-01-15'
    }
  ]);

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Build what people <span className="sharp-gradient-text font-extrabold">follow</span>.
            </h1>
            <p className="text-[#94A3B8] mt-1 text-sm sm:text-base">Campaign planning dashboard - audience engine at scale</p>
          </div>
        </div>

        {/* Stats Cards - 4 cards in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Campaigns */}
          <div className="kult-card">
            <div>
              <div className="text-[#94A3B8] text-sm uppercase tracking-wide mb-2">Total Campaigns</div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totalCampaigns}</div>
              <div className="text-[#00E5CC] text-sm">{stats.activeCampaigns} active</div>
            </div>
          </div>

          {/* Total Budget */}
          <div className="kult-card">
            <div>
              <div className="text-[#94A3B8] text-sm uppercase tracking-wide mb-2">Total Budget</div>
              <div className="text-4xl font-bold text-white mb-1">RM {(stats.totalBudget / 1000).toFixed(0)}K</div>
              <div className="text-[#10B981] text-sm">Allocated RM {(stats.allocatedBudget / 1000).toFixed(0)}K</div>
            </div>
          </div>

          {/* Average CPM */}
          <div className="kult-card">
            <div>
              <div className="text-[#94A3B8] text-sm uppercase tracking-wide mb-2">Average CPM</div>
              <div className="text-4xl font-bold text-white mb-1">RM {stats.averageMargin}</div>
              <div className="text-[#FF0080] text-sm">Across all campaigns</div>
            </div>
          </div>

          {/* Total Impressions */}
          <div className="kult-card">
            <div>
              <div className="text-[#94A3B8] text-sm uppercase tracking-wide mb-2">Total Impressions</div>
              <div className="text-4xl font-bold text-white mb-1">{(stats.totalImpressions / 1000000).toFixed(1)}M</div>
              <div className="text-[#00E5CC] text-sm">Estimated reach</div>
            </div>
          </div>
        </div>

        {/* Removed old Total Impressions full-width card */}
        <div className="kult-card" style={{ display: 'none' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[#94A3B8] text-sm uppercase tracking-wide mb-2">Total Impressions</div>
              <div className="text-4xl font-bold text-white mb-1">{(stats.totalImpressions / 1000000).toFixed(1)}M</div>
              <div className="text-[#00E5CC] text-sm">Estimated reach</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00E5CC]/20 to-[#00E5CC]/5 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Smart Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Insight 1 */}
          <div className="smart-insight-card kult-card">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#00E5CC]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-[#00E5CC] font-semibold mb-1">Smart Insight</div>
                <div className="text-sm text-white">TV deallocated 21% of total spend last month</div>
              </div>
            </div>
          </div>

          {/* Insight 2 */}
          <div className="smart-insight-card kult-card">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#00E5CC]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-[#00E5CC] font-semibold mb-1">Smart Insight</div>
                <div className="text-sm text-white">Digital Video CPM is trending 18% lower than previous quarter</div>
              </div>
            </div>
          </div>

          {/* Insight 3 */}
          <div className="smart-insight-card-pink kult-card">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF0080]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#FF0080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-[#FF0080] font-semibold mb-1">Smart Insight</div>
                <div className="text-sm text-white">3 campaigns have &gt;RM600K margin opportunity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button 
            className="kult-btn-primary flex items-center"
            onClick={() => navigate('/ai-wizard')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Campaign Wizard
          </button>
          <button 
            className="kult-btn-secondary flex items-center"
            onClick={() => navigate('/upload-brief')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Brief
          </button>
          <button 
            className="kult-btn-outline"
            onClick={() => navigate('/build-plan')}
          >
            Build Your Plan
          </button>
          <button 
            className="kult-btn-outline"
            onClick={() => navigate('/campaigns')}
          >
            View All Plans
          </button>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">[ RECENT ACTIVITY ]</div>
              <h2 className="text-xl font-bold text-white">Latest Campaign Plans</h2>
            </div>
          </div>

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id}
                className="kult-card hover:border-[#00E5CC]/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-white group-hover:text-[#00E5CC] transition-colors">
                        {campaign.name}
                      </h3>
                      <span className="px-2 py-1 bg-[#10B981]/20 text-[#10B981] text-xs rounded-full font-medium">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="text-sm text-[#94A3B8] mt-1">
                      {campaign.client} - {campaign.type}
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-[#94A3B8] group-hover:text-[#00E5CC] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-center space-x-8 py-8">
          <button className="flex flex-col items-center group">
            <div className="w-12 h-12 rounded-full bg-[#1A1F35] group-hover:bg-[#00E5CC]/20 flex items-center justify-center transition-colors mb-2">
              <svg className="w-6 h-6 text-[#94A3B8] group-hover:text-[#00E5CC] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <span className="text-sm text-[#94A3B8] group-hover:text-white transition-colors">Save</span>
          </button>
          <button className="flex flex-col items-center group">
            <div className="w-12 h-12 rounded-full bg-[#1A1F35] group-hover:bg-[#00E5CC]/20 flex items-center justify-center transition-colors mb-2">
              <svg className="w-6 h-6 text-[#94A3B8] group-hover:text-[#00E5CC] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <span className="text-sm text-[#94A3B8] group-hover:text-white transition-colors">Share</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
