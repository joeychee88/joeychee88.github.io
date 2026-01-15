import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

// Industry options matching the playbook
const INDUSTRIES = [
  'Automotive', 'Property', 'FMCG', 'Beauty & Cosmetics', 'Retail / eCommerce',
  'Telco', 'Banking / Fintech', 'Tourism', 'Tech & Devices', 'SME / B2B',
  'Entertainment / OTT', 'Gaming', 'Luxury', 'Education', 'F&B', 'Lifestyle'
];

// Campaign objectives
const OBJECTIVES = [
  'Awareness', 'Traffic', 'Engagement', 'Lead generation', 
  'Sales / Conversions', 'Brand building'
];

// Geography options
const GEO_TYPES = [
  { value: 'nationwide', label: 'Nationwide (Malaysia)' },
  { value: 'peninsular', label: 'Peninsular Malaysia only' },
  { value: 'east', label: 'East Malaysia only' },
  { value: 'custom', label: 'Custom states / regions' }
];

// Budget flexibility options
const BUDGET_FLEXIBILITY = [
  { value: 'fixed', label: 'Fixed – cannot exceed' },
  { value: 'stretch', label: 'Can stretch by ~10%' },
  { value: 'ballpark', label: 'Rough ballpark – open to recommendations' }
];

// Buying preference options
const BUYING_PREFERENCES = [
  { value: 'direct', label: 'Direct only' },
  { value: 'mix', label: 'Mix of Direct & Programmatic' },
  { value: 'programmatic', label: 'Programmatic-first' },
  { value: 'none', label: 'No preference' }
];

// Mock personas - these should come from API in production
const MOCK_PERSONAS = [
  'Automotive Enthusiasts', 'Fashion Icons', 'Foodies', 'Health & Wellness Shoppers',
  'Youth Mom', 'Young Working Adult', 'Students', 'Gadget Gurus',
  'Online Shoppers', 'Gaming Community', 'Sports Fans', 'Music Lovers'
];

// Mock formats by category
const FORMAT_CATEGORIES = {
  'High Impact': [
    { id: 'masthead', name: 'Masthead', desc: 'Premium homepage takeover', bestFor: 'Awareness, Launch', tags: ['Awareness'] },
    { id: 'siteTakeover', name: 'Site Takeover', desc: 'Full site domination', bestFor: 'Brand building', tags: ['Awareness'] },
    { id: 'skinner', name: 'Skinner', desc: 'Expandable side panel', bestFor: 'Engagement', tags: ['Awareness', 'Consideration'] }
  ],
  'Video': [
    { id: 'instream', name: 'In-Stream Video', desc: 'Pre, mid, post-roll video', bestFor: 'Awareness, Storytelling', tags: ['Awareness'] },
    { id: 'outstream', name: 'Out-Stream Video', desc: 'Native video in content', bestFor: 'Reach', tags: ['Awareness'] },
    { id: 'videoBanner', name: 'Video In-Banner', desc: 'Video within display unit', bestFor: 'Engagement', tags: ['Consideration'] }
  ],
  'Display & Native': [
    { id: 'leaderboard', name: 'Leaderboard', desc: 'Standard 728x90 banner', bestFor: 'Reach', tags: ['Awareness'] },
    { id: 'mrec', name: 'MREC', desc: 'Medium rectangle 300x250', bestFor: 'Visibility', tags: ['Awareness'] },
    { id: 'catfish', name: 'Catfish', desc: 'Sticky bottom banner', bestFor: 'Mobile reach', tags: ['Awareness'] }
  ],
  'Lead & Performance Units': [
    { id: 'leadForm', name: 'Lead Form', desc: 'Native lead capture', bestFor: 'Lead generation', tags: ['Performance'] },
    { id: 'dataCapture', name: 'Data Capture', desc: 'User info collection', bestFor: 'Leads', tags: ['Performance'] },
    { id: 'calculator', name: 'Calculator Ads', desc: 'Interactive calculator', bestFor: 'Finance, Property', tags: ['Consideration', 'Performance'] }
  ],
  'Interactive / Gamified': [
    { id: 'miniGame', name: 'Mini Game', desc: 'Playable ad unit', bestFor: 'Engagement', tags: ['Engagement'] },
    { id: 'carousel', name: 'Carousel', desc: 'Swipeable product showcase', bestFor: 'Product discovery', tags: ['Consideration'] },
    { id: 'countdown', name: 'Countdown Timer', desc: 'Urgency-driven unit', bestFor: 'Promotions', tags: ['Performance'] }
  ]
};

// Mock sites by channel
const MOCK_SITES = {
  'OTT': [
    { id: 'astroGo', name: 'Astro GO', category: 'Entertainment', tags: ['Premium', 'Family'], description: 'Premium OTT app with high household penetration and longer session durations.' },
    { id: 'sooka', name: 'Sooka', category: 'Entertainment', tags: ['Movies', 'Series'], description: 'Streaming service with diverse content library.' },
    { id: 'stadiumAstro', name: 'Stadium Astro', category: 'Sports', tags: ['Sports', 'EPL'], description: 'Male-skewed sports audience, strong EPL affinity.' }
  ],
  'Web': [
    { id: 'gempak', name: 'Gempak', category: 'News', tags: ['Malay', 'Youth'], description: 'Malay-language news and entertainment portal.' },
    { id: 'xuan', name: 'Xuan', category: 'Lifestyle', tags: ['Chinese', 'Female'], description: 'Chinese-language lifestyle and entertainment.' }
  ],
  'Social': [
    { id: 'meta', name: 'Meta (Facebook/Instagram)', category: 'Social', tags: ['Social', 'Broad'], description: 'Largest social media reach in Malaysia.' },
    { id: 'tiktok', name: 'TikTok', category: 'Social', tags: ['Youth', 'Video'], description: 'Short-form video platform popular with Gen Z.' }
  ]
};

function BuildPlanNew() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errors, setErrors] = useState({});

  // Campaign plan state
  const [campaignPlan, setCampaignPlan] = useState({
    // Step 1 - Campaign Info
    campaignName: '',
    objective: '',
    industry: '',
    brand: '',
    startDate: '',
    endDate: '',
    
    // Step 2 - Audience
    personas: [],
    audienceIntent: '',
    exclusions: '',
    
    // Step 3 - Geography
    geoType: 'nationwide',
    customGeo: '',
    
    // Step 4 - Budget
    budget: '',
    budgetFlexibility: 'fixed',
    buyingPreference: 'none',
    
    // Step 5 - Formats
    selectedFormats: [],
    
    // Step 6 - Sites
    selectedSites: [],
    optimizedGroups: [],
    
    // Calculated fields
    estimatedImpressions: 0,
    estimatedReach: 0
  });

  const STEPS = [
    { number: 1, title: 'Campaign Info', icon: '📋' },
    { number: 2, title: 'Audience', icon: '👥' },
    { number: 3, title: 'Geography', icon: '🗺️' },
    { number: 4, title: 'Budget', icon: '💰' },
    { number: 5, title: 'Formats', icon: '🎨' },
    { number: 6, title: 'Sites', icon: '🌐' },
    { number: 7, title: 'Summary', icon: '✅' }
  ];

  // Auto-save on state change
  useEffect(() => {
    localStorage.setItem('campaignPlanDraft', JSON.stringify(campaignPlan));
  }, [campaignPlan]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('campaignPlanDraft');
    if (draft) {
      try {
        setCampaignPlan(JSON.parse(draft));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Update campaign plan
  const updatePlan = (updates) => {
    setCampaignPlan(prev => ({ ...prev, ...updates }));
  };

  // Validation functions
  const validateStep1 = () => {
    const newErrors = {};
    if (!campaignPlan.objective) newErrors.objective = 'Please select a primary objective';
    if (!campaignPlan.industry) newErrors.industry = 'Please select an industry';
    
    // Soft warning for campaign name
    if (!campaignPlan.campaignName) {
      newErrors.campaignName = 'Give this campaign a name so you can find it easily later.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).filter(k => k !== 'campaignName').length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (campaignPlan.personas.length === 0) {
      newErrors.personas = 'Please select at least 1 persona';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (campaignPlan.geoType === 'custom' && !campaignPlan.customGeo.trim()) {
      newErrors.customGeo = 'Tell us at least one state or region so we know where to concentrate the plan.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};
    const budget = parseFloat(campaignPlan.budget);
    
    if (!campaignPlan.budget || isNaN(budget) || budget <= 0) {
      newErrors.budget = 'Please enter a valid budget greater than 0';
    } else if (budget < 20000) {
      newErrors.budgetWarning = 'Budgets under RM 20k may limit the number of channels and formats we can use.';
    }
    
    setErrors(newErrors);
    return !newErrors.budget;
  };

  const validateStep5 = () => {
    const newErrors = {};
    if (campaignPlan.selectedFormats.length === 0) {
      newErrors.formats = 'Please select at least 1 format';
    } else if (campaignPlan.selectedFormats.length === 1 && 
               campaignPlan.objective === 'Awareness' &&
               !campaignPlan.selectedFormats.some(f => ['masthead', 'siteTakeover', 'skinner', 'instream', 'outstream'].includes(f))) {
      newErrors.formatsWarning = 'For awareness campaigns, add at least one video or high-impact format for meaningful visibility.';
    }
    setErrors(newErrors);
    return !newErrors.formats;
  };

  const validateStep6 = () => {
    const newErrors = {};
    if (campaignPlan.selectedSites.length === 0 && campaignPlan.optimizedGroups.length === 0) {
      newErrors.sites = 'Please select at least 1 site or 1 optimized group';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation
  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
      setErrors({});
    }
  };

  const handleNext = () => {
    let isValid = true;
    
    switch (currentStep) {
      case 1: isValid = validateStep1(); break;
      case 2: isValid = validateStep2(); break;
      case 3: isValid = validateStep3(); break;
      case 4: isValid = validateStep4(); break;
      case 5: isValid = validateStep5(); break;
      case 6: isValid = validateStep6(); break;
      default: isValid = true;
    }
    
    if (isValid) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      if (currentStep < 7) {
        setCurrentStep(currentStep + 1);
        setErrors({});
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleAIAssist = () => {
    // TODO: Implement AI assistance for current step
    alert('AI assistance coming soon! This will pre-populate fields based on your existing plan data.');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  // Step 1 - Campaign Info
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
        We'll start with the basics. You can refine details later, but we need at least an objective and an industry to use the right playbook.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Campaign name
        </label>
        <input
          type="text"
          value={campaignPlan.campaignName}
          onChange={(e) => updatePlan({ campaignName: e.target.value })}
          placeholder="E.g. New SUV launch Q3 2026"
          className={`w-full px-4 py-3 bg-[#1a1a1a] border ${errors.campaignName ? 'border-yellow-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500`}
        />
        <p className="mt-1 text-xs text-gray-400">Use a name your sales team and client will recognise later.</p>
        {errors.campaignName && <p className="mt-1 text-xs text-yellow-400">{errors.campaignName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Primary objective <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {OBJECTIVES.map(obj => (
            <button
              key={obj}
              onClick={() => updatePlan({ objective: obj })}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                campaignPlan.objective === obj
                  ? 'border-cyan-500 bg-cyan-900/20 text-cyan-300'
                  : 'border-gray-700 bg-[#1a1a1a] text-gray-300 hover:border-gray-600'
              }`}
            >
              {obj}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">Pick the main outcome. The planner will adjust formats and channels around this.</p>
        {errors.objective && <p className="mt-1 text-xs text-red-400">{errors.objective}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Industry <span className="text-red-400">*</span>
        </label>
        <select
          value={campaignPlan.industry}
          onChange={(e) => updatePlan({ industry: e.target.value })}
          className={`w-full px-4 py-3 bg-[#1a1a1a] border ${errors.industry ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-cyan-500`}
        >
          <option value="">Select industry...</option>
          {INDUSTRIES.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">This connects to the KULT industry playbook to auto-suggest audiences and formats.</p>
        {errors.industry && <p className="mt-1 text-xs text-red-400">{errors.industry}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brand / product line
        </label>
        <input
          type="text"
          value={campaignPlan.brand}
          onChange={(e) => updatePlan({ brand: e.target.value })}
          placeholder="E.g. Brand X – EV sedan, Brand Y – collagen drink"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
        />
        <p className="mt-1 text-xs text-gray-400">Short description of what we are advertising.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Planned flight dates (optional)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input
              type="date"
              value={campaignPlan.startDate}
              onChange={(e) => updatePlan({ startDate: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End date</label>
            <input
              type="date"
              value={campaignPlan.endDate}
              onChange={(e) => updatePlan({ endDate: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400">If dates are not confirmed, you can skip this. We'll still estimate weekly pacing.</p>
      </div>
    </div>
  );

  // Step 2 - Audience
  const renderStep2 = () => {
    const togglePersona = (persona) => {
      const newPersonas = campaignPlan.personas.includes(persona)
        ? campaignPlan.personas.filter(p => p !== persona)
        : [...campaignPlan.personas, persona];
      updatePlan({ personas: newPersonas });
    };

    return (
      <div className="space-y-6">
        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
          Choose the personas that matter. We will pull the right Astro audience segments and scale from there.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Personas (KULT Audience Playbook) <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MOCK_PERSONAS.map(persona => (
              <button
                key={persona}
                onClick={() => togglePersona(persona)}
                className={`px-4 py-2 rounded-full border-2 transition-all ${
                  campaignPlan.personas.includes(persona)
                    ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                    : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                }`}
              >
                {persona}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">Start with 3–5 personas max. The planner can always scale up later.</p>
          {errors.personas && <p className="mt-1 text-xs text-red-400">{errors.personas}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Any specific intent or behaviours?
          </label>
          <textarea
            value={campaignPlan.audienceIntent}
            onChange={(e) => updatePlan({ audienceIntent: e.target.value })}
            placeholder='E.g. "Test drive intenders", "Price-sensitive young families", "K-Drama binge watchers"'
            rows={3}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <p className="mt-1 text-xs text-gray-400">This gives the AI a chance to refine the persona mix and channel weightage.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Anyone we should exclude?
          </label>
          <input
            type="text"
            value={campaignPlan.exclusions}
            onChange={(e) => updatePlan({ exclusions: e.target.value })}
            placeholder="E.g. existing customers, kids under 18, other regions"
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>
    );
  };

  // Step 3 - Geography  
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
        Your reach and impressions will auto-scale based on the geo you choose. East Malaysia and regional campaigns will show smaller but more realistic reach.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Geography selection <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {GEO_TYPES.map(geo => (
            <label
              key={geo.value}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                campaignPlan.geoType === geo.value
                  ? 'border-cyan-500 bg-cyan-900/20'
                  : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="geoType"
                value={geo.value}
                checked={campaignPlan.geoType === geo.value}
                onChange={(e) => updatePlan({ geoType: e.target.value })}
                className="w-4 h-4 text-cyan-500 mr-3"
              />
              <span className="text-white">{geo.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">You can type "East Coast", "Northern", "Sabah only", etc. We'll map it to the state-level audience table.</p>
      </div>

      {campaignPlan.geoType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Which states or regions? <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={campaignPlan.customGeo}
            onChange={(e) => updatePlan({ customGeo: e.target.value })}
            placeholder="E.g. Klang Valley, Sabah, Sarawak, Northern region"
            className={`w-full px-4 py-3 bg-[#1a1a1a] border ${errors.customGeo ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500`}
          />
          <p className="mt-1 text-xs text-gray-400">The AI will map Malaysian region terms to specific states and scale impressions based on internet penetration.</p>
          {errors.customGeo && <p className="mt-1 text-xs text-red-400">{errors.customGeo}</p>}
        </div>
      )}
    </div>
  );

  // Step 4 - Budget
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
        This step defines the scale of your plan. You can still change the budget later from the Summary screen.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Total campaign budget (RM) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          value={campaignPlan.budget}
          onChange={(e) => updatePlan({ budget: e.target.value })}
          placeholder="E.g. 80,000"
          min="0"
          step="1000"
          className={`w-full px-4 py-3 bg-[#1a1a1a] border ${errors.budget ? 'border-red-500' : errors.budgetWarning ? 'border-yellow-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500`}
        />
        <p className="mt-1 text-xs text-gray-400">Use media budget only. We'll handle pacing and allocation by channel automatically.</p>
        {errors.budget && <p className="mt-1 text-xs text-red-400">{errors.budget}</p>}
        {errors.budgetWarning && <p className="mt-1 text-xs text-yellow-400">{errors.budgetWarning}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How flexible is this budget?
        </label>
        <div className="space-y-2">
          {BUDGET_FLEXIBILITY.map(flex => (
            <label
              key={flex.value}
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                campaignPlan.budgetFlexibility === flex.value
                  ? 'border-cyan-500 bg-cyan-900/20'
                  : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="budgetFlexibility"
                value={flex.value}
                checked={campaignPlan.budgetFlexibility === flex.value}
                onChange={(e) => updatePlan({ budgetFlexibility: e.target.value })}
                className="w-4 h-4 text-cyan-500 mr-3"
              />
              <span className="text-white">{flex.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Buying preference
        </label>
        <select
          value={campaignPlan.buyingPreference}
          onChange={(e) => updatePlan({ buyingPreference: e.target.value })}
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          {BUYING_PREFERENCES.map(pref => (
            <option key={pref.value} value={pref.value}>{pref.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">If you're not sure, choose "No preference" and we'll optimise using playbook rules and rates.</p>
      </div>
    </div>
  );

  // Step 5 - Formats
  const renderStep5 = () => {
    const toggleFormat = (formatId) => {
      const newFormats = campaignPlan.selectedFormats.includes(formatId)
        ? campaignPlan.selectedFormats.filter(f => f !== formatId)
        : [...campaignPlan.selectedFormats, formatId];
      updatePlan({ selectedFormats: newFormats });
    };

    return (
      <div className="space-y-6">
        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
          We've preselected formats based on your objective and industry. You can remove or add as needed.
        </div>

        {errors.formats && <p className="text-sm text-red-400 mb-2">{errors.formats}</p>}
        {errors.formatsWarning && <p className="text-sm text-yellow-400 mb-2">{errors.formatsWarning}</p>}

        <div className="space-y-8">
          {Object.entries(FORMAT_CATEGORIES).map(([category, formats]) => (
            <div key={category}>
              <h3 className="text-lg font-bold text-white mb-1">{category}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {category === 'High Impact' && 'For launches, takeovers and big brand moments.'}
                {category === 'Video' && 'Use these when sight, sound, and story matter.'}
                {category === 'Display & Native' && 'Bread-and-butter reach and supporting inventory.'}
                {category === 'Lead & Performance Units' && 'Formats that collect data, leads, or drive measurable actions.'}
                {category === 'Interactive / Gamified' && 'Use selectively to create engagement spikes, not as the only format.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formats.map(format => (
                  <div
                    key={format.id}
                    onClick={() => toggleFormat(format.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      campaignPlan.selectedFormats.includes(format.id)
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{format.name}</h4>
                      <input
                        type="checkbox"
                        checked={campaignPlan.selectedFormats.includes(format.id)}
                        onChange={() => {}}
                        className="w-5 h-5 text-cyan-500"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{format.desc}</p>
                    <div className="text-xs text-cyan-400">Best for: {format.bestFor}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {format.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Step 6 - Sites
  const renderStep6 = () => {
    const toggleSite = (siteId) => {
      const newSites = campaignPlan.selectedSites.includes(siteId)
        ? campaignPlan.selectedSites.filter(s => s !== siteId)
        : [...campaignPlan.selectedSites, siteId];
      updatePlan({ selectedSites: newSites });
    };

    const toggleOptimizedGroup = (channel) => {
      const newGroups = campaignPlan.optimizedGroups.includes(channel)
        ? campaignPlan.optimizedGroups.filter(g => g !== channel)
        : [...campaignPlan.optimizedGroups, channel];
      updatePlan({ optimizedGroups: newGroups });
    };

    return (
      <div className="space-y-6">
        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
          We've filtered recommended sites based on your audience and industry. You can pin must-have sites or let the planner optimise within a group.
        </div>

        {errors.sites && <p className="text-sm text-red-400 mb-2">{errors.sites}</p>}

        <div className="space-y-8">
          {Object.entries(MOCK_SITES).map(([channel, sites]) => (
            <div key={channel}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{channel}</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignPlan.optimizedGroups.includes(channel)}
                    onChange={() => toggleOptimizedGroup(channel)}
                    className="w-4 h-4 text-cyan-500 mr-2"
                  />
                  <span className="text-sm text-gray-300">Optimise across this group automatically</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(site => (
                  <div
                    key={site.id}
                    onClick={() => toggleSite(site.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      campaignPlan.selectedSites.includes(site.id)
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                    }`}
                    title={site.description}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{site.name}</h4>
                        <p className="text-xs text-cyan-400">{site.category}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={campaignPlan.selectedSites.includes(site.id)}
                        onChange={() => {}}
                        className="w-5 h-5 text-cyan-500"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{site.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {site.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Step 7 - Summary
  const renderStep7 = () => (
    <div className="space-y-6">
      <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-4 text-sm text-cyan-200">
        Here's the draft plan based on your inputs and the KULT playbook. You can still edit any step above before sharing with your client or manager.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Overview */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Campaign Overview</h3>
          <div className="space-y-3">
            <div><span className="text-gray-400">Name:</span> <span className="text-white font-medium">{campaignPlan.campaignName || 'Untitled Campaign'}</span></div>
            <div><span className="text-gray-400">Objective:</span> <span className="text-cyan-400">{campaignPlan.objective}</span></div>
            <div><span className="text-gray-400">Industry:</span> <span className="text-white">{campaignPlan.industry}</span></div>
            <div><span className="text-gray-400">Brand:</span> <span className="text-white">{campaignPlan.brand || 'N/A'}</span></div>
            {campaignPlan.startDate && campaignPlan.endDate && (
              <div><span className="text-gray-400">Flight Dates:</span> <span className="text-white">{campaignPlan.startDate} to {campaignPlan.endDate}</span></div>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Budget</h3>
          <div className="space-y-3">
            <div><span className="text-gray-400">Total Budget:</span> <span className="text-white font-bold text-xl">RM {parseFloat(campaignPlan.budget || 0).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Flexibility:</span> <span className="text-white">{BUDGET_FLEXIBILITY.find(f => f.value === campaignPlan.budgetFlexibility)?.label}</span></div>
            <div><span className="text-gray-400">Buying:</span> <span className="text-white">{BUYING_PREFERENCES.find(p => p.value === campaignPlan.buyingPreference)?.label}</span></div>
          </div>
        </div>

        {/* Audience */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Audience Selection</h3>
          <div className="space-y-2">
            <div className="text-gray-400 text-sm">Personas ({campaignPlan.personas.length}):</div>
            <div className="flex flex-wrap gap-2">
              {campaignPlan.personas.map(persona => (
                <span key={persona} className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-sm rounded-full border border-cyan-700/50">
                  {persona}
                </span>
              ))}
            </div>
            {campaignPlan.audienceIntent && (
              <div className="pt-2">
                <div className="text-gray-400 text-sm">Intent:</div>
                <div className="text-white text-sm">{campaignPlan.audienceIntent}</div>
              </div>
            )}
          </div>
        </div>

        {/* Geography */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Geography</h3>
          <div className="space-y-2">
            <div><span className="text-gray-400">Type:</span> <span className="text-white">{GEO_TYPES.find(g => g.value === campaignPlan.geoType)?.label}</span></div>
            {campaignPlan.geoType === 'custom' && campaignPlan.customGeo && (
              <div><span className="text-gray-400">Regions:</span> <span className="text-white">{campaignPlan.customGeo}</span></div>
            )}
          </div>
        </div>

        {/* Formats */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Formats</h3>
          <div className="text-gray-400 text-sm mb-2">{campaignPlan.selectedFormats.length} formats selected:</div>
          <div className="flex flex-wrap gap-2">
            {campaignPlan.selectedFormats.map(formatId => {
              const format = Object.values(FORMAT_CATEGORIES).flat().find(f => f.id === formatId);
              return format ? (
                <span key={formatId} className="px-3 py-1 bg-purple-900/30 text-purple-300 text-sm rounded-full border border-purple-700/50">
                  {format.name}
                </span>
              ) : null;
            })}
          </div>
        </div>

        {/* Sites */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Sites</h3>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-2">{campaignPlan.selectedSites.length} sites selected:</div>
              <div className="flex flex-wrap gap-2">
                {campaignPlan.selectedSites.map(siteId => {
                  const site = Object.values(MOCK_SITES).flat().find(s => s.id === siteId);
                  return site ? (
                    <span key={siteId} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
                      {site.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            {campaignPlan.optimizedGroups.length > 0 && (
              <div>
                <div className="text-gray-400 text-sm mb-2">Optimized groups:</div>
                <div className="flex flex-wrap gap-2">
                  {campaignPlan.optimizedGroups.map(group => (
                    <span key={group} className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-sm rounded-full border border-cyan-700/50">
                      {group} (auto-optimized)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estimated Reach */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Estimated Reach & Impressions</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Estimated Impressions</div>
            <div className="text-3xl font-bold text-cyan-400">12.5M</div>
            <div className="text-xs text-gray-500 mt-1">Based on budget and selected formats</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Estimated Reach</div>
            <div className="text-3xl font-bold text-purple-400">3.2M</div>
            <div className="text-xs text-gray-500 mt-1">Unique users in target geography</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Export & Share</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save as draft
          </button>
          <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export to PDF
          </button>
          <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          <button className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Send to AI Strategist
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 border-t border-gray-800 pt-4">
        All numbers shown are estimates and should be validated against latest rate cards and inventory availability.
      </div>
    </div>
  );

  // Plan Summary Sidebar
  const PlanSummary = () => (
    <div className="w-80 border-l border-gray-800 bg-[#0a0a0a] overflow-y-auto sticky top-0 h-screen">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Plan Summary</h3>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Objective</div>
            <div className="text-white">{campaignPlan.objective || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Budget</div>
            <div className="text-cyan-400 font-bold">
              {campaignPlan.budget ? `RM ${parseFloat(campaignPlan.budget).toLocaleString()}` : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Geography</div>
            <div className="text-white text-sm">{GEO_TYPES.find(g => g.value === campaignPlan.geoType)?.label || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Audiences</div>
            <div className="flex flex-wrap gap-1">
              {campaignPlan.personas.length > 0 ? (
                campaignPlan.personas.slice(0, 3).map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded">
                    {p}
                  </span>
                ))
              ) : <span className="text-gray-500 text-sm">-</span>}
              {campaignPlan.personas.length > 3 && (
                <span className="text-xs text-gray-500">+{campaignPlan.personas.length - 3} more</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Formats</div>
            <div className="text-white">{campaignPlan.selectedFormats.length} selected</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sites</div>
            <div className="text-white">{campaignPlan.selectedSites.length + campaignPlan.optimizedGroups.length} selected</div>
          </div>
          <div className="pt-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Est. Impressions</div>
            <div className="text-purple-400 font-bold">12.5M</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-400 font-bold tracking-wider uppercase">
                [ KULT AI MEDIA STRATEGIST ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase">Build Your Plan</h1>
              <p className="text-gray-400 mt-1 text-sm">Multi-step campaign planner with AI assistance</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Step {currentStep} of 7</div>
              <div className="text-xs text-gray-500">{STEPS[currentStep - 1].title}</div>
            </div>
          </div>
        </div>

        {/* Horizontal Stepper */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {STEPS.map((step, idx) => {
              const isActive = step.number === currentStep;
              const isCompleted = completedSteps.includes(step.number);
              const isClickable = step.number <= currentStep || isCompleted;

              return (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => isClickable && goToStep(step.number)}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-cyan-900/30 border-2 border-cyan-500 text-cyan-300' 
                        : isCompleted
                        ? 'bg-green-900/20 border border-green-700 text-green-300 hover:bg-green-900/30'
                        : isClickable
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-xl">{isCompleted ? '✓' : step.icon}</span>
                    <div className="text-left hidden lg:block">
                      <div className={`text-xs ${isActive ? 'font-bold' : ''}`}>{step.number}. {step.title}</div>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-700' : 'bg-gray-800'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-800 mt-3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Step Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 lg:p-8 max-w-5xl">
              {/* Step Title */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {currentStep}. {STEPS[currentStep - 1].title}
                </h2>
              </div>

              {/* Step Content */}
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    currentStep === 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  ← Back
                </button>

                <button
                  onClick={handleAIAssist}
                  className="px-6 py-3 bg-purple-900/30 border border-purple-700/50 text-purple-300 rounded-lg font-medium hover:bg-purple-900/50 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Let AI fill this step for me
                </button>

                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-cyan-500/50"
                >
                  {currentStep === 7 ? 'Finish' : 'Next →'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Plan Summary (Sticky) */}
          <PlanSummary />
        </div>
      </div>
    </Layout>
  );
}

export default BuildPlanNew;
