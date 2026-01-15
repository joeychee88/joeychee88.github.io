import React, { useState } from 'react';

/**
 * PlanSummary - Collapsible sticky bottom bar showing current plan selections
 */
const PlanSummary = ({ planData = {}, onGeneratePlan, isComplete = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed to avoid blocking navigation
  
  const {
    audiences = [],
    geographies = [],
    formats = [],
    sites = [],
    totalBudget = 0
  } = planData;

  const formatBudget = (amount) => {
    if (!amount) return 'RM 0';
    return `RM ${amount.toLocaleString()}`;
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    const total = 5;
    
    if (audiences.length > 0) completed++;
    if (geographies.length > 0) completed++;
    if (formats.length > 0) completed++;
    if (sites.length > 0) completed++;
    if (totalBudget > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const completionPercent = getCompletionPercentage();

  return (
    <div className={`fixed left-0 right-0 bg-[#0f0f0f]/98 backdrop-blur-lg border-t-2 border-indigo-500 shadow-2xl z-40 transition-all duration-300 ${
      isCollapsed ? 'bottom-0' : 'bottom-0'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-2.5">
        {/* Collapsed State - Just a minimal bar */}
        {isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCollapsed(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Expand plan summary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <span className="text-white text-sm font-semibold">My Campaign Plan</span>
              <span className="text-cyan-400 text-xs font-semibold">{completionPercent}%</span>
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                  style={{ width: `${completionPercent}%` }}
                ></div>
              </div>
            </div>
            <button
              onClick={onGeneratePlan}
              disabled={!isComplete}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                isComplete
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Plan
            </button>
          </div>
        ) : (
          /* Expanded State - Full details */
          <div>
            <div className="flex items-center justify-between gap-6">
              {/* Left: Progress */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm">My Campaign Plan</h3>
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Collapse plan summary"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-cyan-400 text-xs font-semibold">{completionPercent}% complete</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Middle: Summary */}
              <div className="flex gap-6 text-xs">
                <div>
                  <span className="text-gray-400">Audiences:</span>
                  <span className="text-white ml-1 font-semibold">{audiences.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Geo:</span>
                  <span className="text-white ml-1 font-semibold">{geographies.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Formats:</span>
                  <span className="text-white ml-1 font-semibold">{formats.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Sites:</span>
                  <span className="text-white ml-1 font-semibold">{sites.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Budget:</span>
                  <span className="text-white ml-1 font-semibold">{formatBudget(totalBudget)}</span>
                </div>
              </div>

              {/* Right: Action */}
              <button
                onClick={onGeneratePlan}
                disabled={!isComplete}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  isComplete
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 shadow-lg hover:shadow-cyan-500/50'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isComplete ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Media Plan
                  </span>
                ) : (
                  'Complete selections to generate'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanSummary;
