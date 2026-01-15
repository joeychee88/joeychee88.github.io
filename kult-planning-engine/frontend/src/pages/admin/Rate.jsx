import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axios from 'axios';

function AdminRate() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRates, setSelectedRates] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [planName, setPlanName] = useState('');
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState({
    platform: [],
    devices: [],
    cpmRange: [0, 100]
  });

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1yuwCrClue85lEv40EJpWc_b3Qef9vk3B3kouE2IByPE/edit';

  const fetchRates = async (skipCache = false) => {
    try {
      setError(null);
      const url = skipCache ? '/api/rates?skipCache=true' : '/api/rates';
      const response = await axios.get(url);
      
      if (response.data.success) {
        setRates(response.data.data || []);
        setLastUpdated(new Date());
        
        // Calculate max CPM for slider
        const maxCpm = Math.max(
          ...response.data.data.map(r => 
            Math.max(
              parseFloat(r['CPM Direct (RM)']) || 0,
              parseFloat(r['CPM PG (RM)']) || 0,
              parseFloat(r['CPM PD (RM)']) || 0
            )
          )
        );
        setFilters(prev => ({ ...prev, cpmRange: [0, Math.ceil(maxCpm + 10)] }));
      } else {
        throw new Error('Failed to fetch rates');
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
      setError(err.response?.data?.error || 'Failed to load rates. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRates(true);
  };

  // Extract unique filter options
  // Platform filter: Use simplified categories
  const platformCategories = ['OTT', 'Web', 'App'];
  
  const uniqueDevices = [...new Set(rates.flatMap(r => 
    (r['Devices'] || '').split(',').map(d => d.trim()).filter(Boolean)
  ))];

  // Apply filters
  const filteredRates = rates.filter(rate => {
    // Platform filter - handles combined values like "App, Web" or "OTT & Web"
    if (filters.platform.length > 0) {
      const ratePlatform = rate['Type of Platform'] || '';
      // Check if any selected platform is included in the rate's platform string
      const platformMatch = filters.platform.some(selectedPlatform => 
        ratePlatform.toLowerCase().includes(selectedPlatform.toLowerCase())
      );
      if (!platformMatch) {
        return false;
      }
    }

    // Devices filter
    if (filters.devices.length > 0) {
      const rateDevices = (rate['Devices'] || '').split(',').map(d => d.trim());
      if (!filters.devices.some(d => rateDevices.includes(d))) {
        return false;
      }
    }

    // CPM range filter
    const maxCpm = Math.max(
      parseFloat(rate['CPM Direct (RM)']) || 0,
      parseFloat(rate['CPM PG (RM)']) || 0,
      parseFloat(rate['CPM PD (RM)']) || 0
    );
    if (maxCpm < filters.cpmRange[0] || maxCpm > filters.cpmRange[1]) {
      return false;
    }

    return true;
  });

  // Handle add/remove rate
  const handleAddRate = (rate) => {
    const existing = selectedRates.find(r => r.id === rate.id);
    if (existing) {
      // Remove if already exists
      setSelectedRates(selectedRates.filter(r => r.id !== rate.id));
      if (selectedRates.length === 1) {
        setShowSummary(false);
      }
    } else {
      // Add new rate with default values
      const newRate = {
        ...rate,
        campaignType: 'PD', // Each rate has its own campaign type
        calculatorData: {
          inputValue: '',
          outputValue: '',
          inputMode: 'budget'
        }
      };
      setSelectedRates([...selectedRates, newRate]);
      setShowSummary(true);
    }
  };

  // Check if rate is selected
  const isRateInAnyGroup = (rateId) => {
    return selectedRates.some(r => r.id === rateId);
  };

  // Handle save plan
  const handleSavePlan = () => {
    if (selectedRates.length === 0) {
      alert('Please add at least one rate to save');
      return;
    }
    setShowSaveDialog(true);
  };

  // Confirm save with name
  const confirmSavePlan = async () => {
    if (!planName.trim()) {
      alert('Please enter a plan name');
      return;
    }
    
    const planData = {
      name: planName,
      rates: selectedRates.map(r => ({
        platform: r['Platform'],
        pillar: r['Pillar'],
        campaignType: r.campaignType,
        cpm: getCPMForRate(r, r.campaignType),
        inputMode: r.calculatorData.inputMode,
        inputValue: r.calculatorData.inputValue,
        outputValue: r.calculatorData.outputValue
      })),
      totals: calculateTotals(),
      createdAt: new Date().toISOString()
    };
    
    try {
      // Save to localStorage for now (will be replaced with API call)
      const existingPlans = JSON.parse(localStorage.getItem('savedRatePlans') || '[]');
      existingPlans.push(planData);
      localStorage.setItem('savedRatePlans', JSON.stringify(existingPlans));
      
      console.log('Plan saved:', planData);
      
      setShowSaveDialog(false);
      setPlanName('');
      
      // Show success message with navigation option
      const viewPlans = window.confirm(`Plan "${planName}" saved successfully!\n\nWould you like to view all saved plans?`);
      if (viewPlans) {
        navigate('/build-plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan. Please try again.');
    }
  };

  // Update calculator data for a specific rate
  const updateRateCalculator = (rateId, value) => {
    setSelectedRates(selectedRates.map(rate => {
      if (rate.id === rateId) {
        const cpm = getCPMForRate(rate, rate.campaignType);
        const inputNum = parseFloat(value.replace(/,/g, '')) || 0;
        let outputValue = '';
        
        if (rate.calculatorData.inputMode === 'budget') {
          // Input: Budget → Output: Impressions
          outputValue = cpm > 0 ? Math.floor((inputNum / cpm) * 1000).toLocaleString() : '0';
        } else {
          // Input: Impressions → Output: Budget
          const budgetValue = cpm > 0 ? (inputNum / 1000) * cpm : 0;
          outputValue = budgetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        return { 
          ...rate, 
          calculatorData: { 
            ...rate.calculatorData,
            inputValue: value,
            outputValue: outputValue
          } 
        };
      }
      return rate;
    }));
  };

  // Toggle calculator input mode (swap input/output) - preserves and converts values
  const toggleCalculatorMode = (rateId) => {
    setSelectedRates(selectedRates.map(rate => {
      if (rate.id === rateId) {
        const newMode = rate.calculatorData.inputMode === 'budget' ? 'impressions' : 'budget';
        
        // Smart swap: current output becomes new input
        const currentOutputRaw = rate.calculatorData.outputValue.replace(/,/g, '');
        const newInputValue = currentOutputRaw || '';
        
        // Calculate new output based on swapped input
        const cpm = getCPMForRate(rate, rate.campaignType);
        const inputNum = parseFloat(currentOutputRaw) || 0;
        let newOutputValue = '';
        
        if (newMode === 'budget') {
          // Now inputting budget, output impressions
          newOutputValue = cpm > 0 ? Math.floor((inputNum / cpm) * 1000).toLocaleString() : '0';
        } else {
          // Now inputting impressions, output budget
          const budgetValue = cpm > 0 ? (inputNum / 1000) * cpm : 0;
          newOutputValue = budgetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        return { 
          ...rate, 
          calculatorData: { 
            inputMode: newMode,
            inputValue: newInputValue ? parseFloat(newInputValue).toLocaleString('en-US') : '',
            outputValue: newOutputValue
          } 
        };
      }
      return rate;
    }));
  };

  // Update campaign type for a specific rate
  const updateCampaignType = (rateId, newType) => {
    setSelectedRates(selectedRates.map(rate => {
      if (rate.id === rateId) {
        // Recalculate with new CPM
        const cpm = getCPMForRate(rate, newType);
        const inputNum = parseFloat(rate.calculatorData.inputValue.replace(/,/g, '')) || 0;
        let outputValue = '';
        
        if (rate.calculatorData.inputMode === 'budget') {
          outputValue = cpm > 0 ? Math.floor((inputNum / cpm) * 1000).toLocaleString() : '0';
        } else {
          const budgetValue = cpm > 0 ? (inputNum / 1000) * cpm : 0;
          outputValue = budgetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        return { 
          ...rate, 
          campaignType: newType,
          calculatorData: {
            ...rate.calculatorData,
            outputValue: outputValue
          }
        };
      }
      return rate;
    }));
  };

  // Get CPM based on campaign type
  const getCPMForRate = (rate, type) => {
    switch(type) {
      case 'PD':
        return parseFloat(rate['CPM PD (RM)']) || 0;
      case 'PG':
        return parseFloat(rate['CPM PG (RM)']) || 0;
      case 'Direct':
        return parseFloat(rate['CPM Direct (RM)']) || 0;
      default:
        return 0;
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    return selectedRates.reduce((acc, rate) => {
      const cpm = getCPMForRate(rate, rate.campaignType);
      const inputNum = parseFloat(rate.calculatorData.inputValue.replace(/,/g, '')) || 0;
      
      if (rate.calculatorData.inputMode === 'budget') {
        acc.budget += inputNum;
        acc.impressions += cpm > 0 ? Math.floor((inputNum / cpm) * 1000) : 0;
      } else {
        acc.impressions += inputNum;
        acc.budget += cpm > 0 ? (inputNum / 1000) * cpm : 0;
      }
      return acc;
    }, { budget: 0, impressions: 0 });
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading rate cards...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ ADMIN / RATE MANAGEMENT ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Rate Configuration</h1>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <a
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2d3748] text-white rounded-md hover:bg-[#3d4758] transition-colors flex items-center text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <span>Edit Source</span>
              </a>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-md hover:bg-[#0e7490] disabled:opacity-50 transition-all flex items-center text-sm"
              >
                <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex">
          {/* Left Content Area */}
          <div className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all ${showSummary ? 'mr-96' : ''}`}>
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* SECTION A: Filters */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Filters</h3>
                {(filters.platform.length > 0 || filters.devices.length > 0) && (
                  <button
                    onClick={() => setFilters({ platform: [], devices: [], cpmRange: [0, 100] })}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Platform Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Platform</label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'platform' ? null : 'platform')}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">
                      {filters.platform.length === 0 ? 'All Platforms' : `${filters.platform.length} selected`}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${openDropdown === 'platform' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'platform' && (
                    <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                      {platformCategories.map(platform => (
                        <label key={platform} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.platform.includes(platform)}
                            onChange={(e) => {
                              setFilters(prev => ({
                                ...prev,
                                platform: e.target.checked
                                  ? [...prev.platform, platform]
                                  : prev.platform.filter(p => p !== platform)
                              }));
                            }}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                          />
                          <span className="text-sm text-white">{platform}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Devices Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Devices</label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'devices' ? null : 'devices')}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">
                      {filters.devices.length === 0 ? 'All Devices' : `${filters.devices.length} selected`}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${openDropdown === 'devices' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'devices' && (
                    <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                      {uniqueDevices.map(device => (
                        <label key={device} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.devices.includes(device)}
                            onChange={(e) => {
                              setFilters(prev => ({
                                ...prev,
                                devices: e.target.checked
                                  ? [...prev.devices, device]
                                  : prev.devices.filter(d => d !== device)
                              }));
                            }}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                          />
                          <span className="text-sm text-white">{device}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* CPM Range Slider */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    CPM Range: RM {filters.cpmRange[0]} - RM {filters.cpmRange[1]}
                  </label>
                  <div className="px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.cpmRange[1]}
                      onChange={(e) => setFilters({ ...filters, cpmRange: [0, parseInt(e.target.value)] })}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION B: Rate Cards Grid */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Rate Cards
                  <span className="ml-3 text-sm font-normal text-gray-400">({filteredRates.length})</span>
                </h3>
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {filteredRates.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-400">No rates match your filters</h3>
                  <p className="mt-1 text-sm text-gray-600">Try adjusting your filter criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRates.map((rate) => {
                    const isSelected = isRateInAnyGroup(rate.id);
                    
                    // Get the lowest CPM (PD is usually lowest, then PG, then Direct)
                    const cpmValues = [
                      parseFloat(rate['CPM PD (RM)']) || 0,
                      parseFloat(rate['CPM PG (RM)']) || 0,
                      parseFloat(rate['CPM Direct (RM)']) || 0
                    ].filter(val => val > 0);
                    const lowestCpm = cpmValues.length > 0 ? Math.min(...cpmValues) : 0;
                    
                    return (
                      <div
                        key={rate.id}
                        className={`bg-[#0a0a0a] border rounded-lg p-4 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' 
                            : 'border-gray-700 hover:border-cyan-500/50'
                        }`}
                        onClick={() => handleAddRate(rate)}
                      >
                        {/* Card Header */}
                        <div className="mb-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-bold text-white flex-1">{rate['Platform']}</h4>
                            {isSelected && (
                              <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-cyan-400">{rate['Pillar']}</p>
                        </div>

                        {/* Card Details */}
                        <div className="space-y-2 mb-3">
                          <div>
                            <span className="text-xs text-gray-500">Type:</span>
                            <span className="text-xs text-gray-300 ml-2">{rate['Type of Platform']}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Ad Inventory:</span>
                            <span className="text-xs text-gray-300 ml-2">{rate['Ad Inventory']}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Devices:</span>
                            <span className="text-xs text-gray-300 ml-2">{rate['Devices']}</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="pt-3 border-t border-gray-800">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500 uppercase" style={{ fontSize: '0.6rem' }}>FROM</span>
                            <span className="text-lg font-bold text-white">RM {lowestCpm > 0 ? lowestCpm : '-'}</span>
                          </div>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRate(rate);
                          }}
                          className={`mt-3 w-full py-2 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {isSelected ? 'Added' : 'Add to Plan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: Right Panel Summary */}
          {showSummary && (
            <div className="fixed right-0 top-0 h-full w-96 bg-[#0f0f0f] border-l border-gray-800 shadow-2xl overflow-y-auto z-50">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Campaign Planner
                  </h3>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Selected Rates */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Selected Rates ({selectedRates.length})</h4>
                  <div className="space-y-3">
                    {selectedRates.map((rate) => {
                      const cpm = getCPMForRate(rate, rate.campaignType);
                      return (
                        <div key={rate.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                          {/* Rate Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{rate['Platform']}</p>
                              <p className="text-xs text-gray-500">{rate['Pillar']}</p>
                            </div>
                            <button
                              onClick={() => handleAddRate(rate)}
                              className="text-gray-500 hover:text-red-400 ml-2"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Buy Type Selector */}
                          <div className="mb-2">
                            <label className="text-xs text-gray-500 block mb-1">Buy Type</label>
                            <div className="grid grid-cols-3 gap-1">
                              {['PD', 'PG', 'Direct'].map(type => (
                                <button
                                  key={type}
                                  onClick={() => updateCampaignType(rate.id, type)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    rate.campaignType === type
                                      ? type === 'PD' ? 'bg-cyan-500 text-white'
                                        : type === 'PG' ? 'bg-purple-500 text-white'
                                        : 'bg-orange-500 text-white'
                                      : 'bg-[#0f0f0f] text-gray-400 hover:bg-gray-800'
                                  }`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* CPM Display */}
                          <div className="text-xs text-cyan-400 mb-2">
                            CPM ({rate.campaignType}): RM {cpm > 0 ? cpm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                          </div>

                          {/* Calculator */}
                          <div className="space-y-2">
                            {/* Input */}
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">
                                {rate.calculatorData.inputMode === 'budget' ? 'Budget (RM)' : 'Impressions'}
                              </label>
                              <input
                                type="text"
                                value={rate.calculatorData.inputValue}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    const formatted = value ? parseFloat(value).toLocaleString('en-US') : '';
                                    updateRateCalculator(rate.id, formatted);
                                  }
                                }}
                                placeholder="Enter value"
                                className="w-full px-2 py-1.5 bg-[#0a0a0a] border border-cyan-500 rounded text-white text-xs focus:border-cyan-400 focus:outline-none"
                              />
                            </div>
                            
                            {/* Swap Button */}
                            <div className="flex justify-center">
                              <button
                                onClick={() => toggleCalculatorMode(rate.id)}
                                className="p-1.5 bg-[#0f0f0f] border border-gray-700 rounded-full hover:bg-gray-800 hover:border-cyan-500 transition-all"
                                title="Swap calculation"
                              >
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Output */}
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">
                                {rate.calculatorData.inputMode === 'budget' ? 'Impressions' : 'Budget (RM)'}
                              </label>
                              <div className="w-full px-2 py-1.5 bg-[#0f0f0f] border border-gray-800 rounded text-cyan-400 text-xs">
                                {rate.calculatorData.outputValue || '0'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="mb-6 bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-lg p-4 border border-cyan-500/30">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Campaign Totals</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Total Budget:</span>
                      <span className="text-2xl font-bold text-white">
                        RM {totals.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Impressions:</span>
                      <span className="text-xl font-bold text-cyan-400">{totals.impressions.toLocaleString('en-US')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button 
                    onClick={handleSavePlan}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
                  >
                    Save Plan
                  </button>
                  <button 
                    onClick={() => {
                      const planData = { rates: selectedRates, totals };
                      console.log('Export plan:', planData);
                      alert('Export functionality - Check console for plan data');
                    }}
                    className="w-full py-2 bg-[#2d3748] text-white font-medium rounded-lg hover:bg-[#3d4758] transition-colors"
                  >
                    Export Plan
                  </button>
                  <button
                    onClick={() => setSelectedRates([])}
                    className="w-full py-2 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Plan Dialog */}
          {showSaveDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-bold text-white mb-4">Save Campaign Plan</h3>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 block mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmSavePlan();
                    }}
                    placeholder="e.g., Premium Video Package Q1"
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setPlanName('');
                    }}
                    className="flex-1 py-2 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSavePlan}
                    className="flex-1 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default AdminRate;
