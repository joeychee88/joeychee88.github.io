import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Demographic buckets for overlap calculator
const DEMOGRAPHIC_BUCKETS = {
  race: ['Malay', 'Chinese', 'Indian', 'Others'],
  age: ['18-24', '25-34', '35-44', '45-54', '55+'],
  income: ['<RM3000', 'RM3000-RM5000', 'RM5000-RM8000', 'RM8000-RM12000', '>RM12000']
};

// Overlap factors for calculating persona affinity
const OVERLAP_FACTORS = {
  same_segment: 0.8,
  same_state: 0.6,
  same_demographics: 0.7,
  base_overlap: 0.3
};

function OverlapCalculatorModal({ isOpen, onClose, segments, states }) {
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedDemographics, setSelectedDemographics] = useState({
    race: [],
    age: [],
    income: []
  });
  const [calculatedReach, setCalculatedReach] = useState(null);
  const [affinityScore, setAffinityScore] = useState(null);

  const calculateOverlap = () => {
    if (selectedSegments.length === 0) {
      alert('Please select at least one segment');
      return;
    }

    // Calculate total potential reach
    let totalReach = 0;
    selectedSegments.forEach(segId => {
      const segment = segments.find(s => s.id === segId);
      if (segment) {
        totalReach += segment.reach || 0;
      }
    });

    // Apply state filtering
    if (selectedStates.length > 0) {
      totalReach *= (selectedStates.length / states.length);
    }

    // Apply demographic filtering (mutually exclusive logic)
    let demoMultiplier = 1.0;
    Object.keys(selectedDemographics).forEach(category => {
      const selected = selectedDemographics[category];
      if (selected.length > 0) {
        const totalOptions = DEMOGRAPHIC_BUCKETS[category].length;
        demoMultiplier *= (selected.length / totalOptions);
      }
    });

    // Calculate overlap reduction
    let overlapReduction = 1.0;
    if (selectedSegments.length > 1) {
      overlapReduction = 1 - (OVERLAP_FACTORS.same_segment * (selectedSegments.length - 1) * 0.15);
    }

    // Final unduplicated reach
    const unduplicatedReach = Math.round(totalReach * demoMultiplier * overlapReduction);

    // Calculate affinity score
    let affinity = 100;
    if (selectedStates.length > 0) {
      affinity *= OVERLAP_FACTORS.same_state;
    }
    if (Object.values(selectedDemographics).some(arr => arr.length > 0)) {
      affinity *= OVERLAP_FACTORS.same_demographics;
    }

    setCalculatedReach(unduplicatedReach);
    setAffinityScore(Math.round(affinity));
  };

  const addToCampaignPlan = () => {
    const campaignSegment = {
      id: Date.now(),
      segments: selectedSegments.map(id => segments.find(s => s.id === id)?.name).filter(Boolean),
      states: selectedStates,
      demographics: selectedDemographics,
      reach: calculatedReach,
      affinity: affinityScore,
      created_at: new Date().toISOString()
    };

    const existingPlan = JSON.parse(localStorage.getItem('campaignPlan') || '[]');
    existingPlan.push(campaignSegment);
    localStorage.setItem('campaignPlan', JSON.stringify(existingPlan));

    alert('Added to campaign plan!');
    onClose();
  };

  const toggleDemographic = (category, value) => {
    setSelectedDemographics(prev => {
      const current = prev[category] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: newValues };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Overlap Calculator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Segment Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Segments</h3>
            <div className="grid grid-cols-2 gap-2">
              {segments.map(segment => (
                <label key={segment.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSegments.includes(segment.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSegments([...selectedSegments, segment.id]);
                      } else {
                        setSelectedSegments(selectedSegments.filter(id => id !== segment.id));
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{segment.name} ({segment.reach?.toLocaleString()})</span>
                </label>
              ))}
            </div>
          </div>

          {/* State Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select States (Optional)</h3>
            <div className="grid grid-cols-3 gap-2">
              {states.map(state => (
                <label key={state} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedStates.includes(state)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStates([...selectedStates, state]);
                      } else {
                        setSelectedStates(selectedStates.filter(s => s !== state));
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{state}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Demographics Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Demographics (Optional)</h3>
            
            {/* Race */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Race</label>
              <div className="flex flex-wrap gap-2">
                {DEMOGRAPHIC_BUCKETS.race.map(race => (
                  <button
                    key={race}
                    onClick={() => toggleDemographic('race', race)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedDemographics.race.includes(race)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {race}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <div className="flex flex-wrap gap-2">
                {DEMOGRAPHIC_BUCKETS.age.map(age => (
                  <button
                    key={age}
                    onClick={() => toggleDemographic('age', age)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedDemographics.age.includes(age)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Income</label>
              <div className="flex flex-wrap gap-2">
                {DEMOGRAPHIC_BUCKETS.income.map(income => (
                  <button
                    key={income}
                    onClick={() => toggleDemographic('income', income)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedDemographics.income.includes(income)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {income}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="pt-4">
            <button
              onClick={calculateOverlap}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Calculate Unduplicated Reach
            </button>
          </div>

          {/* Results */}
          {calculatedReach !== null && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Unduplicated Reach</p>
                  <p className="text-3xl font-bold text-blue-600">{calculatedReach.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Affinity Score</p>
                  <p className="text-3xl font-bold text-green-600">{affinityScore}%</p>
                </div>
              </div>
              
              <button
                onClick={addToCampaignPlan}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Add to Campaign Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminAudience({ wizardMode = false }) {
  const [segments, setSegments] = useState([]);
  const [states] = useState([
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 
    'Sarawak', 'Selangor', 'Terengganu', 'WP Kuala Lumpur', 'WP Labuan', 'WP Putrajaya'
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [expandedSegments, setExpandedSegments] = useState([]);
  const [showOverlapCalculator, setShowOverlapCalculator] = useState(false);
  const [loading, setLoading] = useState(true);

  // Demographic filters
  const [selectedRace, setSelectedRace] = useState([]);
  const [selectedAge, setSelectedAge] = useState([]);
  const [selectedIncome, setSelectedIncome] = useState([]);

  // Sorting
  const [sortBy, setSortBy] = useState('name'); // name, reach, affinity

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockSegments = [
        { id: 1, name: 'Tech Enthusiasts', reach: 1500000, affinity: 85, states: ['Selangor', 'WP Kuala Lumpur'], demographics: { race: ['Chinese', 'Indian'], age: ['25-34', '35-44'], income: ['>RM12000'] } },
        { id: 2, name: 'Young Professionals', reach: 2200000, affinity: 78, states: ['Selangor', 'Penang', 'Johor'], demographics: { race: ['Malay', 'Chinese'], age: ['25-34'], income: ['RM5000-RM8000', 'RM8000-RM12000'] } },
        { id: 3, name: 'Parents with Kids', reach: 3100000, affinity: 72, states: ['Selangor', 'Johor', 'Penang', 'Perak'], demographics: { race: ['Malay'], age: ['35-44', '45-54'], income: ['RM3000-RM5000', 'RM5000-RM8000'] } },
        { id: 4, name: 'Premium Shoppers', reach: 850000, affinity: 92, states: ['WP Kuala Lumpur', 'Selangor'], demographics: { race: ['Chinese'], age: ['35-44', '45-54'], income: ['>RM12000'] } },
        { id: 5, name: 'Rural Communities', reach: 4500000, affinity: 65, states: ['Kelantan', 'Terengganu', 'Pahang', 'Kedah'], demographics: { race: ['Malay'], age: ['35-44', '45-54', '55+'], income: ['<RM3000', 'RM3000-RM5000'] } },
        { id: 6, name: 'Urban Millennials', reach: 1800000, affinity: 88, states: ['WP Kuala Lumpur', 'Selangor', 'Penang'], demographics: { race: ['Chinese', 'Malay', 'Indian'], age: ['25-34'], income: ['RM5000-RM8000', 'RM8000-RM12000'] } },
      ];
      setSegments(mockSegments);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSegments = segments.filter(segment => {
    // Search filter
    if (searchQuery && !segment.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // State filter
    if (selectedStates.length > 0) {
      const hasMatchingState = selectedStates.some(state => segment.states.includes(state));
      if (!hasMatchingState) return false;
    }

    // Demographic filters
    if (selectedRace.length > 0) {
      const hasMatchingRace = selectedRace.some(race => segment.demographics.race.includes(race));
      if (!hasMatchingRace) return false;
    }

    if (selectedAge.length > 0) {
      const hasMatchingAge = selectedAge.some(age => segment.demographics.age.includes(age));
      if (!hasMatchingAge) return false;
    }

    if (selectedIncome.length > 0) {
      const hasMatchingIncome = selectedIncome.some(income => segment.demographics.income.includes(income));
      if (!hasMatchingIncome) return false;
    }

    return true;
  });

  // Sort segments
  const sortedSegments = [...filteredSegments].sort((a, b) => {
    switch (sortBy) {
      case 'reach':
        return b.reach - a.reach;
      case 'affinity':
        return b.affinity - a.affinity;
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const calculateTotalReach = () => {
    if (selectedSegments.length === 0) return 0;
    const total = selectedSegments.reduce((sum, segId) => {
      const segment = segments.find(s => s.id === segId);
      return sum + (segment?.reach || 0);
    }, 0);
    // Apply overlap reduction
    const overlapFactor = selectedSegments.length > 1 ? 0.85 : 1;
    return Math.round(total * overlapFactor);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStates([]);
    setSelectedSegments([]);
    setSelectedRace([]);
    setSelectedAge([]);
    setSelectedIncome([]);
  };

  const hasActiveFilters = searchQuery || selectedStates.length > 0 || 
    selectedRace.length > 0 || selectedAge.length > 0 || selectedIncome.length > 0;

  const toggleSegmentExpansion = (segmentId) => {
    setExpandedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audience Segments</h2>
          <p className="text-sm text-gray-600">
            {wizardMode && '🧙‍♂️ Wizard Mode: '} Select and configure target audience segments
          </p>
        </div>
        <div className="flex space-x-3">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear All Filters
            </button>
          )}
          <button
            onClick={fetchSegments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          {selectedSegments.length > 0 && (
            <button
              onClick={() => setShowOverlapCalculator(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Calculate Overlap ({selectedSegments.length})
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by States</label>
          <div className="flex flex-wrap gap-2">
            {states.map(state => (
              <button
                key={state}
                onClick={() => {
                  setSelectedStates(prev =>
                    prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedStates.includes(state)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Demographic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Race */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Race</label>
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHIC_BUCKETS.race.map(race => (
                <button
                  key={race}
                  onClick={() => {
                    setSelectedRace(prev =>
                      prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedRace.includes(race)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {race}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHIC_BUCKETS.age.map(age => (
                <button
                  key={age}
                  onClick={() => {
                    setSelectedAge(prev =>
                      prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedAge.includes(age)
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Income</label>
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHIC_BUCKETS.income.map(income => (
                <button
                  key={income}
                  onClick={() => {
                    setSelectedIncome(prev =>
                      prev.includes(income) ? prev.filter(i => i !== income) : [...prev, income]
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedIncome.includes(income)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {income}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="reach">Reach (High to Low)</option>
            <option value="affinity">Affinity (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Selected Segments Summary */}
      {selectedSegments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selected Segments</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedSegments.length} segments · {calculateTotalReach().toLocaleString()} reach
              </p>
            </div>
            <button
              onClick={() => setSelectedSegments([])}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Segments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading segments...</p>
          </div>
        ) : sortedSegments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No segments found matching your filters</p>
          </div>
        ) : (
          sortedSegments.map(segment => (
            <div
              key={segment.id}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                selectedSegments.includes(segment.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(segment.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSegments([...selectedSegments, segment.id]);
                        } else {
                          setSelectedSegments(selectedSegments.filter(id => id !== segment.id));
                        }
                      }}
                      className="mt-1 rounded text-blue-600"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{segment.name}</h3>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">Reach:</span> {segment.reach.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">Affinity:</span> {segment.affinity}%
                        </span>
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">States:</span> {segment.states.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSegmentExpansion(segment.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedSegments.includes(segment.id) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedSegments.includes(segment.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">States:</p>
                      <div className="flex flex-wrap gap-1">
                        {segment.states.map(state => (
                          <span key={state} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {state}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Demographics:</p>
                      <div className="space-y-1">
                        <div>
                          <span className="text-xs text-gray-600">Race: </span>
                          {segment.demographics.race.map(r => (
                            <span key={r} className="text-xs text-gray-700 mr-2">{r}</span>
                          ))}
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Age: </span>
                          {segment.demographics.age.map(a => (
                            <span key={a} className="text-xs text-gray-700 mr-2">{a}</span>
                          ))}
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Income: </span>
                          {segment.demographics.income.map(i => (
                            <span key={i} className="text-xs text-gray-700 mr-2">{i}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Overlap Calculator Modal */}
      <OverlapCalculatorModal
        isOpen={showOverlapCalculator}
        onClose={() => setShowOverlapCalculator(false)}
        segments={segments}
        states={states}
      />
    </div>
  );
}

function EnhancedDashboardV2() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wizardMode, setWizardMode] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KULT Planning Engine</h1>
              <p className="text-sm text-gray-600">Enhanced Dashboard V2</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setWizardMode(!wizardMode)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  wizardMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {wizardMode ? '🧙‍♂️ Wizard Mode ON' : 'Enable Wizard Mode'}
              </button>
              <button
                onClick={() => navigate('/admin/formats')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Formats
              </button>
              <button
                onClick={() => navigate('/admin/targeting')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Targeting
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminAudience wizardMode={wizardMode} />
      </main>
    </div>
  );
}

export default EnhancedDashboardV2;
