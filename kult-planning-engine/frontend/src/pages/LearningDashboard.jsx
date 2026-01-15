/**
 * Learning Dashboard - View feedback stats and AI learning insights
 */

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

function LearningDashboard() {
  const [stats, setStats] = useState(null);
  const [weights, setWeights] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [aiChatStats, setAiChatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningInProgress, setLearningInProgress] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, weightsRes, feedbackRes, aiChatRes] = await Promise.all([
        axios.get(`${API_URL}/api/feedback/stats`),
        axios.get(`${API_URL}/api/feedback/weights`),
        axios.get(`${API_URL}/api/feedback/recent?limit=10`),
        axios.get(`${API_URL}/api/ai-chat/learning-dashboard`).catch(() => ({ data: null }))
      ]);
      
      setStats(statsRes.data);
      setWeights(weightsRes.data);
      setRecentFeedback(feedbackRes.data);
      setAiChatStats(aiChatRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerLearning = async () => {
    setLearningInProgress(true);
    try {
      const response = await axios.post(`${API_URL}/api/feedback/learn`);
      console.log('Learning completed:', response.data);
      await loadDashboardData(); // Reload data
      alert('Learning analysis completed successfully!');
    } catch (error) {
      console.error('Error triggering learning:', error);
      alert('Failed to trigger learning analysis');
    } finally {
      setLearningInProgress(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading learning dashboard..." />
      </Layout>
    );
  }

  const topPersonas = weights?.personas 
    ? Object.entries(weights.personas)
        .sort((a, b) => b[1].normalized_score - a[1].normalized_score)
        .slice(0, 10)
    : [];

  const topPlatforms = weights?.platforms
    ? Object.entries(weights.platforms)
        .sort((a, b) => b[1].normalized_score - a[1].normalized_score)
        .slice(0, 8)
    : [];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🧠 AI Learning Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Monitor feedback and AI self-learning insights
                </p>
              </div>
              <button
                onClick={triggerLearning}
                disabled={learningInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {learningInProgress ? (
                  <>
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 rounded-full border-2 border-gray-400"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                    </div>
                    <span>Learning...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Run Learning Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Feedback</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_feedback || 0}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Approved Plans</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{stats?.approved_plans || 0}</div>
              <div className="mt-1 text-xs text-gray-500">{stats?.approval_rate}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Average Rating</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">
                {stats?.avg_rating || '0.00'} ⭐
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Personas Tracked</div>
              <div className="mt-2 text-3xl font-bold text-purple-600">
                {Object.keys(weights?.personas || {}).length}
              </div>
            </div>
          </div>

          {/* AI Chat Feedback Stats */}
          {aiChatStats && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 mb-4">
                <h2 className="text-xl font-bold text-white mb-2">💬 AI Chat Wizard Feedback</h2>
                <p className="text-purple-100 text-sm">Real-time feedback from AI conversation responses</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-600">Chat Feedback</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">
                    {aiChatStats.stats?.totalFeedback || 0}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Total responses</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-600">Satisfaction</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">
                    {aiChatStats.stats?.satisfactionRate || '0.0'}%
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Likes vs Total</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-600">👍 Likes</div>
                  <div className="mt-2 text-3xl font-bold text-green-500">
                    {aiChatStats.stats?.likes || 0}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-600">👎 Dislikes</div>
                  <div className="mt-2 text-3xl font-bold text-red-500">
                    {aiChatStats.stats?.dislikes || 0}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-600">🚩 Reports</div>
                  <div className="mt-2 text-3xl font-bold text-orange-500">
                    {aiChatStats.stats?.reports || 0}
                  </div>
                </div>
              </div>

              {/* Report Reasons Breakdown */}
              {aiChatStats.stats?.reportReasons && Object.keys(aiChatStats.stats.reportReasons).length > 0 && (
                <div className="bg-white rounded-lg shadow mt-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">🚩 Report Reasons</h3>
                    <p className="text-sm text-gray-600">What users are reporting</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(aiChatStats.stats.reportReasons).map(([reason, count]) => (
                        <div key={reason} className="bg-orange-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-orange-600">{count}</div>
                          <div className="text-xs text-gray-700 mt-1">{reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Chat Industry & Objective Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {aiChatStats.stats?.topIndustries && Object.keys(aiChatStats.stats.topIndustries).length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">🏢 Top Industries (AI Chat)</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {Object.entries(aiChatStats.stats.topIndustries)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([industry, count]) => (
                            <div key={industry} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{industry}</span>
                              <span className="text-sm font-bold text-purple-600">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {aiChatStats.stats?.topObjectives && Object.keys(aiChatStats.stats.topObjectives).length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">🎯 Top Objectives (AI Chat)</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {Object.entries(aiChatStats.stats.topObjectives)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([objective, count]) => (
                            <div key={objective} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{objective}</span>
                              <span className="text-sm font-bold text-blue-600">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent AI Chat Feedback */}
              {aiChatStats.recentFeedback && aiChatStats.recentFeedback.length > 0 && (
                <div className="bg-white rounded-lg shadow mt-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">💬 Recent AI Chat Feedback</h3>
                    <p className="text-sm text-gray-600">Latest feedback from AI Wizard conversations</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {aiChatStats.recentFeedback.slice(0, 5).map((feedback, idx) => (
                      <div key={idx} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                feedback.feedbackType === 'like' ? 'bg-green-100 text-green-800' :
                                feedback.feedbackType === 'dislike' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {feedback.feedbackType === 'like' ? '👍 Like' :
                                 feedback.feedbackType === 'dislike' ? '👎 Dislike' :
                                 '🚩 Report'}
                              </span>
                              {feedback.reportReason && (
                                <span className="text-xs text-gray-600">
                                  • {feedback.reportReason}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {feedback.industry} • {feedback.objective}
                              </span>
                            </div>
                            {feedback.messagePreview && (
                              <p className="text-sm text-gray-700 line-clamp-2">
                                "{feedback.messagePreview}"
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                            {new Date(feedback.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Performing Personas */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  🎯 Top Performing Personas
                </h2>
                <p className="text-sm text-gray-600">Based on user feedback and plan approval</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {topPersonas.map(([persona, data]) => (
                    <div key={persona} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 capitalize">{persona}</div>
                        <div className="text-xs text-gray-500">
                          {data.selection_count} selections • {(data.removal_rate * 100).toFixed(0)}% removal rate
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${data.normalized_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {(data.normalized_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Platforms */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  📊 Platform Performance
                </h2>
                <p className="text-sm text-gray-600">Budget allocation success rates</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {topPlatforms.map(([platform, data]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 capitalize">{platform}</div>
                        <div className="text-xs text-gray-500">
                          Avg budget: RM {(data.avg_budget_allocated || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${data.normalized_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {(data.normalized_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                ⚠️ Common Issues
              </h2>
              <p className="text-sm text-gray-600">What users most frequently adjust</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats?.common_issues && Object.entries(stats.common_issues).map(([issue, count]) => (
                  <div key={issue} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600 mt-1 capitalize">
                      {issue.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Feedback */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                💬 Recent Feedback
              </h2>
              <p className="text-sm text-gray-600">Latest user submissions</p>
            </div>
            <div className="divide-y divide-gray-200">
              {recentFeedback.map((feedback, idx) => (
                <div key={idx} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={star <= feedback.overall_rating ? 'text-yellow-400' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
                        </div>
                        {feedback.approved && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            ✓ Approved
                          </span>
                        )}
                        <span className="text-xs text-gray-500 capitalize">
                          {feedback.plan_data?.industry || 'Unknown'} • {feedback.plan_data?.campaign_objective || 'N/A'}
                        </span>
                      </div>
                      {feedback.comments && (
                        <p className="text-sm text-gray-700 mb-2">"{feedback.comments}"</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {feedback.dimensional_feedback?.wrong_personas && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Wrong personas</span>
                        )}
                        {feedback.dimensional_feedback?.audience_too_broad && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Too broad</span>
                        )}
                        {feedback.dimensional_feedback?.missing_platforms && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Missing platforms</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                      {new Date(feedback.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              🔄 Learning System Status
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Personas tracked: {Object.keys(weights?.personas || {}).length}</p>
              <p>• Platforms tracked: {Object.keys(weights?.platforms || {}).length}</p>
              <p>• Formats tracked: {Object.keys(weights?.formats || {}).length}</p>
              <p>• Verticals analyzed: {Object.keys(weights?.verticals || {}).length}</p>
              <p>• Last updated: {weights?.last_updated ? new Date(weights.last_updated).toLocaleString() : 'Never'}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default LearningDashboard;
