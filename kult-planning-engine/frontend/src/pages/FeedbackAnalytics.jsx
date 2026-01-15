import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { ThumbsUp, ThumbsDown, RefreshCw, Flag, TrendingUp, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const FeedbackAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [disliked, setDisliked] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [daysBack, setDaysBack] = useState(7);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [daysBack]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch AI Chat learning dashboard data
      const aiChatRes = await axios.get(`${API_BASE_URL}/api/ai-chat/learning-dashboard`);
      
      if (aiChatRes.data && aiChatRes.data.stats) {
        const { stats, recentFeedback } = aiChatRes.data;
        
        // Calculate breakdown by objective and industry from recent feedback
        const byObjective = {};
        const byIndustry = {};
        let regenerationCount = 0;
        
        recentFeedback.forEach(f => {
          // Count regenerations
          if (f.feedbackType === 'regenerate') {
            regenerationCount++;
          }
          
          // By Objective
          if (f.objective) {
            if (!byObjective[f.objective]) {
              byObjective[f.objective] = { total: 0, likes: 0, dislikes: 0 };
            }
            byObjective[f.objective].total++;
            if (f.feedbackType === 'like') byObjective[f.objective].likes++;
            if (f.feedbackType === 'dislike' || f.feedbackType === 'report') byObjective[f.objective].dislikes++;
          }
          
          // By Industry
          if (f.industry) {
            if (!byIndustry[f.industry]) {
              byIndustry[f.industry] = { total: 0, likes: 0, dislikes: 0 };
            }
            byIndustry[f.industry].total++;
            if (f.feedbackType === 'like') byIndustry[f.industry].likes++;
            if (f.feedbackType === 'dislike' || f.feedbackType === 'report') byIndustry[f.industry].dislikes++;
          }
        });
        
        // Transform data to match expected format
        setSummary({
          totalFeedback: stats.totalFeedback || 0,
          likes: stats.likes || 0,
          dislikes: stats.dislikes || 0,
          likeRate: parseFloat(stats.satisfactionRate) || 0,
          reports: stats.reports || 0,
          regenerations: regenerationCount,
          byObjective,
          byIndustry,
          topIndustries: stats.topIndustries || {},
          topObjectives: stats.topObjectives || {},
          reportReasons: stats.reportReasons || {}
        });
        
        // Get disliked feedback
        const dislikedFeedback = recentFeedback
          .filter(f => f.feedbackType === 'dislike' || f.feedbackType === 'report')
          .slice(0, 10);
        setDisliked(dislikedFeedback);
        
        // Store logs for viewing
        setLogs(recentFeedback);
        
        // Generate suggestions based on data
        const suggestions = [];
        if (stats.dislikes > stats.likes) {
          suggestions.push({
            type: 'warning',
            priority: 'high',
            message: 'Dislikes exceed likes - review response quality',
            action: 'Review recent disliked responses and identify patterns'
          });
        }
        if (stats.reports > 0 && stats.reportReasons) {
          const topReason = Object.entries(stats.reportReasons)
            .sort((a, b) => b[1] - a[1])[0];
          if (topReason) {
            suggestions.push({
              type: 'action',
              priority: 'high',
              message: `Most common report: "${topReason[0]}"`,
              action: 'Investigate and improve this specific issue'
            });
          }
        }
        if (parseFloat(stats.satisfactionRate) < 50) {
          suggestions.push({
            type: 'critical',
            priority: 'high',
            message: 'Satisfaction rate below 50% - immediate attention needed',
            action: 'Review AI prompts and response quality immediately'
          });
        }
        if (parseFloat(stats.satisfactionRate) === 0 && stats.totalFeedback === 0) {
          suggestions.push({
            type: 'info',
            priority: 'low',
            message: 'No feedback data yet',
            action: 'Encourage users to provide feedback on AI responses'
          });
        }
        setSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set default empty data
      setSummary({
        totalFeedback: 0,
        likes: 0,
        dislikes: 0,
        likeRate: 0,
        reports: 0,
        byObjective: {},
        byIndustry: {},
        topIndustries: {},
        topObjectives: {},
        reportReasons: {}
      });
      setDisliked([]);
      setSuggestions([{
        type: 'error',
        priority: 'medium',
        message: 'Failed to load analytics data',
        action: 'Check backend connection and try again'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai-chat/learning-dashboard`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-chat-feedback-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading analytics..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase">
                  [ AI FEEDBACK ANALYTICS ]
                </div>
                <h1 className="text-3xl font-black text-white uppercase">
                  Self-Learning Dashboard
                </h1>
                <p className="text-gray-400 mt-1">Track AI performance and identify improvement areas</p>
              </div>
              <div className="flex gap-3">
                <select
                  value={daysBack}
                  onChange={(e) => setDaysBack(parseInt(e.target.value))}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
                <button
                  onClick={downloadReport}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <TrendingUp size={16} />
                Total Feedback
              </div>
              <div className="text-3xl font-bold text-white">{summary?.totalFeedback || 0}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <ThumbsUp size={16} />
                Likes
              </div>
              <div className="text-3xl font-bold text-green-500">{summary?.likes || 0}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <ThumbsDown size={16} />
                Dislikes
              </div>
              <div className="text-3xl font-bold text-red-500">{summary?.dislikes || 0}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <RefreshCw size={16} />
                Regenerations
              </div>
              <div className="text-3xl font-bold text-orange-500">{summary?.regenerations || 0}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Like Rate</div>
              <div className={`text-3xl font-bold ${
                summary?.likeRate >= 70 ? 'text-green-500' : summary?.likeRate >= 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {summary?.likeRate || 0}%
              </div>
            </div>
          </div>

          {/* Performance by Objective */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Performance by Objective</h2>
            <div className="space-y-4">
              {Object.keys(summary?.byObjective || {}).length === 0 ? (
                <div className="text-gray-500 text-center py-4">No data available</div>
              ) : (
                Object.keys(summary.byObjective).map(objective => {
                  const obj = summary.byObjective[objective];
                  const rate = ((obj.likes / obj.total) * 100).toFixed(1);
                  return (
                    <div key={objective} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium">{objective}</div>
                        <div className="text-sm text-gray-400">{obj.total} responses</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-green-500 text-sm flex items-center gap-1">
                          <ThumbsUp size={14} />
                          {obj.likes}
                        </div>
                        <div className="text-red-500 text-sm flex items-center gap-1">
                          <ThumbsDown size={14} />
                          {obj.dislikes}
                        </div>
                        <div className={`text-lg font-bold ${
                          rate >= 70 ? 'text-green-500' : rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {rate}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Performance by Industry */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Performance by Industry</h2>
            <div className="space-y-4">
              {Object.keys(summary?.byIndustry || {}).length === 0 ? (
                <div className="text-gray-500 text-center py-4">No data available</div>
              ) : (
                Object.keys(summary.byIndustry).map(industry => {
                  const ind = summary.byIndustry[industry];
                  const rate = ((ind.likes / ind.total) * 100).toFixed(1);
                  return (
                    <div key={industry} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium">{industry}</div>
                        <div className="text-sm text-gray-400">{ind.total} responses</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-green-500 text-sm flex items-center gap-1">
                          <ThumbsUp size={14} />
                          {ind.likes}
                        </div>
                        <div className="text-red-500 text-sm flex items-center gap-1">
                          <ThumbsDown size={14} />
                          {ind.dislikes}
                        </div>
                        <div className={`text-lg font-bold ${
                          rate >= 70 ? 'text-green-500' : rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {rate}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Report Reasons Chart */}
          {summary?.reportReasons && Object.keys(summary.reportReasons).length > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Flag size={20} className="text-orange-500" />
                Top Report Reasons
              </h2>
              <div className="space-y-4">
                {Object.entries(summary.reportReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const percentage = ((count / (summary.reports || 1)) * 100).toFixed(1);
                    return (
                      <div key={reason} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{reason}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{count} reports</span>
                            <span className="text-orange-400 font-bold">{percentage}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-[#1a1a1a] border border-red-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} />
                Improvement Suggestions
              </h2>
              <div className="space-y-4">
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 pl-4">
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                        suggestion.priority === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <div className="text-white font-medium">{suggestion.message}</div>
                        <div className="text-gray-400 text-sm mt-1">{suggestion.action}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Logs Viewer */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Feedback Logs</h2>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                {showLogs ? (
                  <>
                    <EyeOff size={16} />
                    Hide Logs
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    View All Logs
                  </>
                )}
              </button>
            </div>
            
            {showLogs && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No feedback logs available</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                            log.feedbackType === 'like' ? 'bg-green-600 text-white' :
                            log.feedbackType === 'dislike' ? 'bg-red-600 text-white' :
                            log.feedbackType === 'report' ? 'bg-orange-600 text-white' :
                            'bg-purple-600 text-white'
                          }`}>
                            {log.feedbackType === 'like' && <ThumbsUp size={12} />}
                            {log.feedbackType === 'dislike' && <ThumbsDown size={12} />}
                            {log.feedbackType === 'report' && <Flag size={12} />}
                            {log.feedbackType === 'regenerate' && <RefreshCw size={12} />}
                            {log.feedbackType.toUpperCase()}
                          </span>
                          {log.reportReason && (
                            <span className="text-xs text-orange-400">Reason: {log.reportReason}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div><span className="text-gray-400">Industry:</span> <span className="text-white">{log.industry || 'N/A'}</span></div>
                        <div><span className="text-gray-400">Objective:</span> <span className="text-white">{log.objective || 'N/A'}</span></div>
                      </div>
                      
                      {log.messagePreview && (
                        <div className="bg-gray-900 rounded p-3 text-sm text-gray-300">
                          <div className="text-xs text-gray-500 mb-1">Message Preview:</div>
                          <div className="line-clamp-3">{log.messagePreview}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Recent Disliked Messages */}
          {disliked.length > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Disliked Messages</h2>
              <div className="space-y-4">
                {disliked.map((item, idx) => (
                  <div key={idx} className="border border-gray-700 rounded p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                        item.feedbackType === 'report' ? 'bg-orange-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {item.feedbackType === 'report' ? (
                          <>
                            <Flag size={12} />
                            REPORT
                          </>
                        ) : (
                          <>
                            <ThumbsDown size={12} />
                            DISLIKE
                          </>
                        )}
                      </span>
                      <span className="text-sm text-gray-400">
                        {item.industry} • {item.objective}
                      </span>
                      {item.reportReason && (
                        <span className="text-xs text-orange-400">• {item.reportReason}</span>
                      )}
                    </div>
                    <div className="text-white text-sm bg-gray-900 rounded p-3 mt-2">{item.messagePreview}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FeedbackAnalytics;
