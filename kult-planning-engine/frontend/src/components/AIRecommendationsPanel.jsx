import React, { useState } from 'react';
import RecommendationCard from './RecommendationCard';

/**
 * AIRecommendationsPanel - Right sidebar for AI recommendations
 */
const AIRecommendationsPanel = ({
  currentStep,
  recommendations = [],
  onAddRecommendation,
  selectedItems = [],
  isLoading = false
}) => {
  // State for inline explanation panel
  const [showReachExplanation, setShowReachExplanation] = useState(false);
  
  const stepConfig = {
    audience: {
      title: 'AI Recommended Audiences',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      subtitle: 'Top audiences for your campaign'
    },
    geography: {
      title: 'AI Recommended Geo Mix',
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subtitle: 'Optimal geography weighting'
    },
    formats: {
      title: 'AI Recommended Formats',
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      subtitle: 'Best ad formats for your objective'
    },
    sites: {
      title: 'AI Recommended Sites',
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      subtitle: 'Top publishers for your campaign'
    },
    budget: {
      title: 'AI Recommended Budget Split',
      icon: (
        <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subtitle: 'Optimal budget allocation'
    },
    overview: {
      title: 'AI Brief Analysis',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      subtitle: 'Campaign strategy recommendations'
    }
  };

  const config = stepConfig[currentStep] || stepConfig.overview;

  const isItemAdded = (itemId) => {
    // Check if item is already added
    // For audiences, selectedItems contains names (strings)
    // For formats/sites, selectedItems contains IDs (strings)
    return selectedItems.some(item => {
      if (typeof item === 'string') {
        // Direct string comparison (works for both names and IDs)
        return item === itemId;
      } else if (item.id) {
        // Object comparison by ID
        return item.id === itemId;
      }
      return false;
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-[#0f0f0f]">
        <div className="flex items-center gap-3 mb-2">
          {config.icon}
          <div>
            <h3 className="text-white font-bold text-sm">{config.title}</h3>
            <p className="text-gray-400 text-xs">{config.subtitle}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/20 border border-cyan-500/30 rounded-full">
          <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 2L9.5 6.5L14 8L9.5 9.5L8 14L6.5 9.5L2 8L6.5 6.5L8 2Z"/>
          </svg>
          <span className="text-cyan-400 text-xs font-semibold">Powered by AI</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">Analyzing your campaign brief...</p>
          </div>
        )}

        {!isLoading && recommendations.length > 0 && (
          <div className="space-y-4">
            {currentStep === 'overview' ? (
              // Special rendering for overview/analysis recommendations
              recommendations.map((rec) => {
                if (rec.subtype === 'health') {
                  // Health Score Card
                  return (
                    <div key={rec.id} className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-bold text-sm">{rec.name}</h4>
                        <div className={`text-2xl font-bold ${
                          rec.score >= 80 ? 'text-green-400' : 
                          rec.score >= 60 ? 'text-yellow-400' : 'text-orange-400'
                        }`}>
                          {rec.score}%
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
                        <div 
                          className={`h-3 rounded-full ${
                            rec.score >= 80 ? 'bg-green-500' : 
                            rec.score >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${rec.score}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-400 text-xs">{rec.reason}</p>
                    </div>
                  );
                } else if (rec.subtype === 'strengths') {
                  // Strengths List
                  return (
                    <div key={rec.id} className="bg-[#0f0f0f] border border-green-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-white font-bold text-sm">{rec.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {rec.items.map((item, idx) => (
                          <div key={idx} className="bg-green-900/10 border border-green-800/30 rounded-lg p-3">
                            <div className="text-green-300 text-sm font-semibold mb-1">{item.title}</div>
                            <div className="text-gray-400 text-xs">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (rec.subtype === 'risks') {
                  // Risks/Warnings List
                  return (
                    <div key={rec.id} className="bg-[#0f0f0f] border border-orange-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h4 className="text-white font-bold text-sm">{rec.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {rec.items.map((item, idx) => (
                          <div key={idx} className={`border rounded-lg p-3 ${
                            item.level === 'high' 
                              ? 'bg-red-900/10 border-red-800/30' 
                              : 'bg-orange-900/10 border-orange-800/30'
                          }`}>
                            <div className={`text-sm font-semibold mb-1 ${
                              item.level === 'high' ? 'text-red-300' : 'text-orange-300'
                            }`}>
                              {item.title}
                            </div>
                            <div className="text-gray-400 text-xs mb-2">{item.description}</div>
                            <div className="text-cyan-400 text-xs font-medium">→ {item.action}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (rec.subtype === 'optimizations') {
                  // Optimization Suggestions
                  return (
                    <div key={rec.id} className="bg-[#0f0f0f] border border-purple-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-white font-bold text-sm">{rec.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {rec.items.map((item, idx) => (
                          <div key={idx} className="bg-purple-900/10 border border-purple-800/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-purple-300 text-sm font-semibold">{item.title}</div>
                              <div className="flex gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  item.impact === 'high' 
                                    ? 'bg-green-900/30 text-green-400' 
                                    : 'bg-yellow-900/30 text-yellow-400'
                                }`}>
                                  {item.impact} impact
                                </span>
                              </div>
                            </div>
                            <div className="text-gray-400 text-xs">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (rec.subtype === 'metrics') {
                  // Expected Performance Metrics
                  return (
                    <div key={rec.id} className="bg-[#0f0f0f] border border-cyan-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h4 className="text-white font-bold text-sm">{rec.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-cyan-400 text-xs mb-1">
                            <span>Reach</span>
                            <button
                              onClick={() => setShowReachExplanation(!showReachExplanation)}
                              className="w-3 h-3 text-cyan-400/60 hover:text-cyan-400 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] rounded-full"
                              aria-label="Toggle reach explanation"
                              aria-expanded={showReachExplanation}
                            >
                              <svg 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="text-white text-lg font-bold">
                            {(rec.metrics.reach / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-3">
                          <div className="text-cyan-400 text-xs mb-1">Impressions</div>
                          <div className="text-white text-lg font-bold">
                            {(rec.metrics.impressions / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-3">
                          <div className="text-cyan-400 text-xs mb-1">Estimated CTR</div>
                          <div className="text-white text-lg font-bold">{rec.metrics.ctr}</div>
                        </div>
                        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-3">
                          <div className="text-cyan-400 text-xs mb-1">Est. Clicks</div>
                          <div className="text-white text-lg font-bold">
                            {(rec.metrics.clicks / 1000).toFixed(0)}K
                          </div>
                        </div>
                      </div>
                      
                      {/* Inline Explanation Panel - Pushes layout, never overlays */}
                      {showReachExplanation && (
                        <div className="mt-3 bg-cyan-900/10 border border-cyan-500/30 rounded-lg p-3 animate-fadeIn">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h5 className="text-cyan-400 font-semibold text-xs">About Estimated Reach</h5>
                            </div>
                            <button
                              onClick={() => setShowReachExplanation(false)}
                              className="text-gray-500 hover:text-gray-300 transition-colors"
                              aria-label="Close explanation"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <ul className="space-y-1.5 text-xs text-gray-300">
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span>Modeled using campaign duration and frequency benchmarks</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span>Adjusted for target audience size and demographics</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span>Accounts for geographic penetration and market coverage</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span className="text-gray-400 italic">Actual delivery may vary based on campaign execution</span>
                            </li>
                          </ul>
                        </div>
                      )}
                      
                      <p className="text-gray-500 text-xs mt-3">{rec.reason}</p>
                    </div>
                  );
                }
                return null;
              })
            ) : (
              // Standard recommendation cards for other steps
              recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAdd={onAddRecommendation}
                  isAdded={isItemAdded(rec.type === 'audience' ? rec.name : rec.id)}
                />
              ))
            )}
          </div>
        )}

        {!isLoading && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-gray-500 text-sm">Complete your campaign brief to see AI recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendationsPanel;
