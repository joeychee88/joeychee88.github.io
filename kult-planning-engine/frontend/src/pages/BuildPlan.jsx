import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

function BuildPlan() {
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [searchPersona, setSearchPersona] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [sortBy, setSortBy] = useState('high-to-low');
  const [audienceSegments, setAudienceSegments] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);

  const malaysianStates = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 
    'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 
    'W.P. Labuan', 'W.P. Putrajaya'
  ];

  // Mock audience segments data
  const mockSegments = [
    {
      id: 1,
      name: 'Entertainment Enthusiasts',
      category: 'Entertainment',
      reach: 2500000,
      description: 'Users interested in movies, TV shows, and entertainment content',
      demographics: {
        age: '18-45',
        gender: 'All',
        interests: ['Movies', 'TV Shows', 'Streaming']
      }
    },
    {
      id: 2,
      name: 'Music Lovers',
      category: 'Entertainment',
      reach: 1800000,
      description: 'Active listeners of music streaming platforms',
      demographics: {
        age: '16-35',
        gender: 'All',
        interests: ['Music', 'Concerts', 'Festivals']
      }
    },
    {
      id: 3,
      name: 'Gaming Community',
      category: 'Entertainment',
      reach: 2200000,
      description: 'Mobile and console gaming enthusiasts',
      demographics: {
        age: '18-40',
        gender: 'Male-leaning',
        interests: ['Gaming', 'eSports', 'Tech']
      }
    },
    {
      id: 4,
      name: 'Sports Fans',
      category: 'Entertainment',
      reach: 1950000,
      description: 'Following sports news and live events',
      demographics: {
        age: '20-50',
        gender: 'Male-leaning',
        interests: ['Football', 'Badminton', 'Sports']
      }
    },
    {
      id: 5,
      name: 'Shopping Enthusiasts',
      category: 'E-Commerce',
      reach: 3100000,
      description: 'Active online shoppers and deal hunters',
      demographics: {
        age: '18-45',
        gender: 'Female-leaning',
        interests: ['Shopping', 'Fashion', 'Deals']
      }
    },
    {
      id: 6,
      name: 'Tech Savvy',
      category: 'Technology',
      reach: 1650000,
      description: 'Early adopters of technology and gadgets',
      demographics: {
        age: '22-45',
        gender: 'Male-leaning',
        interests: ['Technology', 'Gadgets', 'Innovation']
      }
    },
    {
      id: 7,
      name: 'Food & Dining',
      category: 'Lifestyle',
      reach: 2800000,
      description: 'Food enthusiasts and restaurant explorers',
      demographics: {
        age: '18-50',
        gender: 'All',
        interests: ['Food', 'Restaurants', 'Cooking']
      }
    }
  ];

  useEffect(() => {
    setAudienceSegments(mockSegments);
  }, []);

  const handleStartPlanning = () => {
    setShowAudienceModal(true);
  };

  const handleStateToggle = (state) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const handleSegmentToggle = (segmentId) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const handleAddSegments = () => {
    const newGroup = {
      id: Date.now(),
      name: `Campaign Group ${campaignGroups.length + 1}`,
      segments: selectedSegments.map(id => 
        mockSegments.find(seg => seg.id === id)
      ),
      states: [...selectedStates],
      createdAt: new Date()
    };
    
    setCampaignGroups([...campaignGroups, newGroup]);
    setShowAudienceModal(false);
    setSelectedSegments([]);
    setSelectedStates([]);
    setSearchPersona('');
  };

  const handleRemoveFilter = (filterType, value) => {
    if (filterType === 'search') {
      setSearchPersona('');
      setActiveFilters(activeFilters.filter(f => f.type !== 'search'));
    } else if (filterType === 'states') {
      setSelectedStates([]);
      setActiveFilters(activeFilters.filter(f => f.type !== 'states'));
    }
  };

  const handleClearAllFilters = () => {
    setSearchPersona('');
    setSelectedStates([]);
    setActiveFilters([]);
  };

  useEffect(() => {
    const filters = [];
    if (searchPersona) {
      filters.push({ type: 'search', label: `Search: "${searchPersona}"`, value: searchPersona });
    }
    if (selectedStates.length > 0) {
      filters.push({ type: 'states', label: `${selectedStates.length} States`, value: selectedStates });
    }
    setActiveFilters(filters);
  }, [searchPersona, selectedStates]);

  const filteredSegments = audienceSegments
    .filter(segment => {
      if (searchPersona) {
        return segment.category.toLowerCase().includes(searchPersona.toLowerCase()) ||
               segment.name.toLowerCase().includes(searchPersona.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'high-to-low') return b.reach - a.reach;
      if (sortBy === 'low-to-high') return a.reach - b.reach;
      return 0;
    });

  const getStateDistribution = () => {
    if (selectedStates.length === 0) return [];
    
    // Mock distribution data
    return selectedStates.slice(0, 3).map((state, idx) => ({
      state,
      percentage: [45, 30, 25][idx] || 0,
      color: ['#3B82F6', '#8B5CF6', '#EC4899'][idx]
    }));
  };

  // Load saved rate plans
  const [savedRatePlans, setSavedRatePlans] = useState([]);

  useEffect(() => {
    // Load saved plans from localStorage
    const plans = JSON.parse(localStorage.getItem('savedRatePlans') || '[]');
    setSavedRatePlans(plans);
  }, []);

  const handleDeletePlan = (index) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      const updatedPlans = savedRatePlans.filter((_, i) => i !== index);
      localStorage.setItem('savedRatePlans', JSON.stringify(updatedPlans));
      setSavedRatePlans(updatedPlans);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-cyan-400 font-semibold mb-2 tracking-wider">
              [ CAMPAIGN PLANNING ]
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Build Your Plan</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage and export your campaign plan</p>
          </div>
        </div>
      </div>

      {/* Saved Rate Plans Section */}
      {savedRatePlans.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-800">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white mb-2">Saved Rate Plans</h2>
            <p className="text-sm text-gray-400">Your saved campaign rate configurations</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRatePlans.map((plan, index) => (
              <div key={index} className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(plan.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(index)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete plan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Rates:</span>
                    <span className="text-white font-medium">{plan.rates.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Budget:</span>
                    <span className="text-white font-medium">
                      RM {plan.totals.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Impressions:</span>
                    <span className="text-cyan-400 font-medium">{plan.totals.impressions.toLocaleString('en-US')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-800">
                  <details className="text-xs">
                    <summary className="text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors">
                      View Rates ({plan.rates.length})
                    </summary>
                    <div className="mt-2 space-y-1 pl-2">
                      {plan.rates.map((rate, rIdx) => (
                        <div key={rIdx} className="text-gray-500">
                          • {rate.platform} ({rate.campaignType})
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {campaignGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-center max-w-xl">
              <h2 className="text-2xl font-bold text-white mb-3">No Campaign Groups Yet</h2>
              <p className="text-gray-400 mb-8">
                Start building your campaign plan by adding segments from the Audience page
              </p>
              <button
                onClick={handleStartPlanning}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
              >
                Start Planning
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {campaignGroups.map(group => (
              <div key={group.id} className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{group.name}</h3>
                  <button className="text-red-400 hover:text-red-300 text-sm">
                    Remove Group
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.segments.map(segment => (
                    <div key={segment.id} className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                      <div className="text-sm text-cyan-400 mb-2">{segment.category}</div>
                      <div className="font-semibold text-white mb-2">{segment.name}</div>
                      <div className="text-sm text-gray-400">
                        Reach: {(segment.reach / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  ))}
                </div>
                {group.states.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-sm text-gray-400">
                      States: {group.states.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <button
              onClick={handleStartPlanning}
              className="w-full px-6 py-4 bg-[#111] border border-gray-800 rounded-xl text-white font-semibold hover:bg-[#1a1a1a] transition-colors"
            >
              + Add Another Campaign Group
            </button>
          </div>
        )}
      </div>

      {/* Select Audience Segments Modal */}
      {showAudienceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-800">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Select Audience Segments</h2>
              <button
                onClick={() => setShowAudienceModal(false)}
                className="px-3 sm:px-6 py-2 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 rounded-lg transition-colors border border-gray-700 text-sm sm:text-base"
              >
                Close
              </button>
            </div>

            {/* Filters Section */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-800 bg-[#0a0a0a]">
              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-400">Active Filters:</span>
                  {activeFilters.map((filter, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm border border-purple-700/50"
                    >
                      {filter.label}
                      <button
                        onClick={() => handleRemoveFilter(filter.type, filter.value)}
                        className="hover:text-purple-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={handleClearAllFilters}
                    className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search by Persona */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                    Search by Persona
                  </label>
                  <input
                    type="text"
                    value={searchPersona}
                    onChange={(e) => setSearchPersona(e.target.value)}
                    placeholder="Entertainment"
                    className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Filter by States */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                    Filter by States (Multi-Select)
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => document.getElementById('states-dropdown').classList.toggle('hidden')}
                      className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-left text-white flex items-center justify-between hover:border-cyan-500 transition-colors"
                    >
                      <span className="text-gray-300">
                        {selectedStates.length > 0 ? `${selectedStates.length} states selected` : 'Select states'}
                      </span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      id="states-dropdown"
                      className="hidden absolute top-full mt-2 w-full bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto"
                    >
                      {malaysianStates.map(state => (
                        <label
                          key={state}
                          className="flex items-center px-4 py-2.5 hover:bg-[#222] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStates.includes(state)}
                            onChange={() => handleStateToggle(state)}
                            className="mr-3 w-4 h-4 accent-cyan-500"
                          />
                          <span className="text-white">{state}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="high-to-low">Audience: High to Low</option>
                    <option value="low-to-high">Audience: Low to High</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {/* Audience Segments List */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">
                    Audience Segments ({filteredSegments.length})
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-cyan-400">Category: Entertainment</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">Showing all related segments</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredSegments.map(segment => (
                    <div
                      key={segment.id}
                      onClick={() => handleSegmentToggle(segment.id)}
                      className={`p-5 rounded-xl border cursor-pointer transition-all ${
                        selectedSegments.includes(segment.id)
                          ? 'bg-cyan-900/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedSegments.includes(segment.id)}
                              onChange={() => {}}
                              className="w-5 h-5 accent-cyan-500"
                            />
                            <div>
                              <div className="font-semibold text-white text-lg">{segment.name}</div>
                              <div className="text-sm text-cyan-400">{segment.category}</div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 ml-8 mb-3">{segment.description}</p>
                          <div className="flex items-center gap-4 ml-8 text-sm">
                            <span className="text-gray-300">
                              <span className="text-gray-500">Reach:</span> {(segment.reach / 1000000).toFixed(1)}M
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-300">
                              <span className="text-gray-500">Age:</span> {segment.demographics.age}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-300">
                              <span className="text-gray-500">Gender:</span> {segment.demographics.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* State Distribution Sidebar */}
              {selectedStates.length > 0 && (
                <div className="w-80 border-l border-gray-800 bg-[#0a0a0a] p-6 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-2">State Distribution</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Showing {selectedStates.length} selected state{selectedStates.length !== 1 ? 's' : ''} breakdown
                  </p>

                  <div className="space-y-4">
                    {getStateDistribution().map((item, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{item.state}</span>
                          <span className="text-cyan-400 font-bold">{item.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedStates.length > 3 && (
                    <div className="mt-4 text-sm text-gray-500">
                      + {selectedStates.length - 3} more state{selectedStates.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {selectedSegments.length} segment{selectedSegments.length !== 1 ? 's' : ''} selected
                {selectedStates.length > 0 && ` • ${selectedStates.length} state${selectedStates.length !== 1 ? 's' : ''}`}
              </div>
              <button
                onClick={handleAddSegments}
                disabled={selectedSegments.length === 0}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  selectedSegments.length > 0
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 shadow-lg hover:shadow-cyan-500/50'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add to Campaign Plan
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

export default BuildPlan;
