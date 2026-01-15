import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import verticalPlaybook from '../data/verticalPlaybook.json';
import AIRecommendationsPanel from '../components/AIRecommendationsPanel';
import PlanSummary from '../components/PlanSummary';
import axios from 'axios';

// Ad formats database with categories
const AD_FORMATS = {
  'High Impact': [
    {
      id: 'masthead',
      name: 'Masthead',
      description: 'Top-of-page premium placement',
      bestFor: 'Product launches, brand awareness',
      tags: ['Awareness']
    },
    {
      id: 'takeover',
      name: 'Site Takeover',
      description: 'Full-site branded experience',
      bestFor: 'Major campaigns, exclusive visibility',
      tags: ['Awareness', 'Brand building']
    },
    {
      id: 'billboard',
      name: 'Billboard',
      description: 'Large above-the-fold placement',
      bestFor: 'High visibility, storytelling',
      tags: ['Awareness']
    }
  ],
  'Video': [
    {
      id: 'instream',
      name: 'In-Stream Video',
      description: 'Pre-roll, mid-roll, post-roll video ads',
      bestFor: 'Brand storytelling, high engagement',
      tags: ['Awareness', 'Engagement']
    },
    {
      id: 'outstream',
      name: 'Out-Stream Video',
      description: 'Auto-play video in content feed',
      bestFor: 'Extended reach without video inventory',
      tags: ['Awareness']
    },
    {
      id: 'bumper',
      name: 'Bumper Ad',
      description: '6-second non-skippable video',
      bestFor: 'Quick brand recall, frequency',
      tags: ['Awareness']
    }
  ],
  'Display & Native': [
    {
      id: 'banner',
      name: 'Banner (MPU, Leaderboard)',
      description: 'Standard display sizes',
      bestFor: 'Cost-efficient reach',
      tags: ['Awareness', 'Traffic']
    },
    {
      id: 'native',
      name: 'Native Article',
      description: 'Content-style ad in feed',
      bestFor: 'Editorial context, engagement',
      tags: ['Engagement', 'Traffic']
    },
    {
      id: 'carousel',
      name: 'Carousel',
      description: 'Multi-image swipeable format',
      bestFor: 'Product showcases, storytelling',
      tags: ['Engagement', 'Consideration']
    }
  ],
  'Lead & Performance': [
    {
      id: 'lead_form',
      name: 'Lead Form',
      description: 'Inline data capture form',
      bestFor: 'Test drives, sign-ups, downloads',
      tags: ['Lead generation', 'Conversions']
    },
    {
      id: 'product_collector',
      name: 'Product Collector',
      description: 'Multi-product showcase with CTA',
      bestFor: 'E-commerce, catalog browsing',
      tags: ['Conversions', 'Traffic']
    },
    {
      id: 'data_capture',
      name: 'Data Capture',
      description: 'Interactive form with incentives',
      bestFor: 'Email collection, user profiling',
      tags: ['Lead generation']
    }
  ],
  'Interactive': [
    {
      id: 'quiz',
      name: 'Quiz / Poll',
      description: 'Interactive engagement unit',
      bestFor: 'User engagement, data collection',
      tags: ['Engagement']
    },
    {
      id: 'ar_filter',
      name: 'AR Filter / Try-On',
      description: 'Augmented reality experience',
      bestFor: 'Beauty, fashion, experiential',
      tags: ['Engagement', 'Brand building']
    },
    {
      id: 'game',
      name: 'Gamified Unit',
      description: 'Mini-game or challenge',
      bestFor: 'High engagement, viral potential',
      tags: ['Engagement']
    }
  ]
};

// Sites database by channel
const SITES_DATABASE = {
  'OTT': [
    {
      id: 'astro_go',
      name: 'Astro GO',
      icon: 'tv',
      category: 'Premium OTT',
      tags: ['News', 'Entertainment', 'Sports', 'Movies'],
      description: 'Premium OTT app with high household penetration and longer session durations',
      monthlyTraffic: '5.2M'
    },
    {
      id: 'stadium_astro',
      name: 'Stadium Astro',
      icon: 'sports',
      category: 'Sports OTT',
      tags: ['Sports', 'EPL', 'Football'],
      description: 'Male-skewed sports audience, strong EPL affinity',
      monthlyTraffic: '2.8M'
    },
    {
      id: 'sooka',
      name: 'Sooka',
      icon: 'film',
      category: 'Entertainment OTT',
      tags: ['Movies', 'Series', 'Entertainment'],
      description: 'Growing OTT platform with diverse content library',
      monthlyTraffic: '1.9M'
    }
  ],
  'Web': [
    {
      id: 'awani',
      name: 'Astro Awani',
      icon: 'newspaper',
      category: 'News',
      tags: ['News', 'Current Affairs', 'Business'],
      description: 'Leading Malaysian news portal, high credibility',
      monthlyTraffic: '8.5M'
    },
    {
      id: 'gempak',
      name: 'Gempak',
      icon: 'sparkles',
      category: 'Entertainment',
      tags: ['Entertainment', 'Celebrities', 'Youth'],
      description: 'Youth-focused entertainment portal',
      monthlyTraffic: '6.2M'
    },
    {
      id: 'xuan',
      name: 'Xuan',
      icon: 'globe',
      category: 'Chinese Lifestyle',
      tags: ['Chinese', 'Lifestyle', 'Entertainment'],
      description: 'Chinese-language lifestyle and entertainment',
      monthlyTraffic: '3.1M'
    },
    {
      id: 'nona',
      name: 'Nona',
      icon: 'user',
      category: 'Women\'s Lifestyle',
      tags: ['Fashion', 'Beauty', 'Lifestyle', 'Women'],
      description: 'Women\'s lifestyle, fashion, and beauty content',
      monthlyTraffic: '4.5M'
    }
  ],
  'Social': [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      category: 'Social',
      tags: ['Social', 'All Demographics', 'Gen X', 'Millennials', 'B40', 'M40', 'T20'],
      description: 'Malaysia\'s largest social network with 22.35M monthly active users (66.5% ad reach)',
      monthlyTraffic: '22.35M',
      traffic: '22.35M',
      formats: ['Static Image', 'Vertical Video', 'Carousel', 'Stories'],
      relevanceScore: 100
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'instagram',
      category: 'Social',
      tags: ['Social', 'Millennials', 'Gen Z', 'Visual Content', 'Lifestyle'],
      description: 'Visual-first platform with 15.70M monthly active users in Malaysia (46.7% ad reach)',
      monthlyTraffic: '15.70M',
      traffic: '15.70M',
      formats: ['Static Image', 'Vertical Video', 'Stories', 'Reels'],
      relevanceScore: 95
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'tiktok',
      category: 'Social',
      tags: ['Social', 'Gen Z', 'Entertainment', 'Short Video'],
      description: 'Fastest-growing platform with 28.68M monthly active users in Malaysia (85.4% ad reach)',
      monthlyTraffic: '28.68M',
      traffic: '28.68M',
      formats: ['Vertical Video', 'In-Feed Ads', 'Top View'],
      relevanceScore: 90
    }
  ]
};

// Malaysia Demographics for filtering calculations
const MALAYSIA_DEMOGRAPHICS = {
  'Race': {
    'Malay': 0.697,
    'Chinese': 0.228,
    'Indian': 0.067
  },
  'Generation': {
    'Gen Z': 0.254,
    'Millennials': 0.303,
    'Gen X': 0.245,
    'Boomers': 0.198
  },
  'Income': {
    'B40': 0.40,
    'M40': 0.40,
    'T20': 0.20
  }
};

// Persona category mappings for overlap estimation
const PERSONA_CATEGORIES = {
  'Entertainment': ['Entertaiment', 'Comedy Lover', 'Horror', 'Romantic Comedy', 'Action & Adventure', 'Animation', 'Sci-Fi & Fantasy', 'Music & Concert Goers'],
  'Sports': ['Sports', 'EPL Super Fans', 'Badminton', 'Golf Fans', 'Sepak Takraw', 'Esports Fan'],
  'Lifestyle': ['Active Lifestyle Seekers', 'Adventure Enthuasiasts', 'Health & Wellness Shoppers', 'Foodies', 'Travel & Experience Seekers', 'Fashion Icons'],
  'Technology': ['Tech & Gadget Enthuasiasts', 'Gadget Gurus', 'Online Shoppers'],
  'Automotive': ['Automative Ethuasiasts', 'Automative Intent'],
  'Business': ['Business & Professional', 'Corporate Visionaries', 'SME', 'Start-ups', 'Emerging Affluents'],
  'Luxury': ['Luxury Buyers', 'Luxury Seekers'],
  'Family': ['Family Dynamic ( Experienced Family )', 'Little Steps Advocates ( Young Family)', 'Mommy Pros ( Experienced Mother)', 'Youth Mom', 'The Dynamic Duo'],
  'Life Stage': ['Students', 'Young Working Adult', 'Soloist'],
  'Home & Living': ['Home Buyers', 'Eco Enthuasiasts']
};

// Get persona category
const getPersonaCategory = (personaName) => {
  for (const [category, personas] of Object.entries(PERSONA_CATEGORIES)) {
    if (personas.some(p => personaName.includes(p) || p.includes(personaName))) {
      return category;
    }
  }
  return 'Other';
};

// Calculate overlap factor between two personas
const getOverlapFactor = (persona1, persona2) => {
  const cat1 = getPersonaCategory(persona1);
  const cat2 = getPersonaCategory(persona2);
  
  // Same category = higher overlap
  if (cat1 === cat2) {
    if (['Entertainment', 'Sports'].includes(cat1)) return 0.75;
    if (['Lifestyle', 'Technology'].includes(cat1)) return 0.60;
    return 0.50;
  }
  
  // Related categories
  if ((cat1 === 'Sports' && cat2 === 'Lifestyle') || (cat1 === 'Lifestyle' && cat2 === 'Sports')) return 0.55;
  if ((cat1 === 'Business' && cat2 === 'Luxury') || (cat1 === 'Luxury' && cat2 === 'Business')) return 0.45;
  if ((cat1 === 'Entertainment' && cat2 === 'Technology') || (cat1 === 'Technology' && cat2 === 'Entertainment')) return 0.30;
  if ((cat1 === 'Lifestyle' && cat2 === 'Technology') || (cat1 === 'Technology' && cat2 === 'Lifestyle')) return 0.30;
  
  // Different categories = lower overlap
  return 0.25;
};

// Icon component for consistent rendering
const SiteIcon = ({ type }) => {
  const icons = {
    tv: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    sports: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    film: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    newspaper: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    sparkles: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    globe: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    user: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    users: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    video: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    youtube: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    facebook: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    tiktok: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    )
  };
  
  return icons[type] || icons.globe;
};

function BuildPlanWizard() {
  // Get campaign ID from URL params (for editing existing campaigns)
  const { id } = useParams();
  
  // Get campaign from route state (if loading a draft)
  const location = useLocation();
  const loadedCampaign = location.state?.campaign;
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(loadedCampaign?.currentStep || 1);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Campaign plan state - single source of truth
  const [campaignPlan, setCampaignPlan] = useState({
    // Step 1: Campaign Info
    campaignName: '',
    advertiserName: '',
    objective: '',
    industry: '',
    brandProduct: '',
    startDate: '',
    endDate: '',
    
    // Step 2: Audience + Geography
    selectedPersonas: [],
    massTargeting: false, // Select all personas
    targetLanguages: [], // Bahasa Malaysia, English, Chinese
    audienceIntent: '',
    audienceExclusions: '',
    demographicFilters: {
      race: [],
      generation: [],
      income: []
    },
    audienceGroups: [], // Array of saved audience groups with unique reach
    selectedStates: [], // Malaysian states for geographic targeting
    
    // Step 3: Formats (moved before budget)
    selectedFormats: [],
    
    // Step 4: Budget + Sites (combined)
    totalBudget: '',
    budgetFlexibility: 'fixed',
    buyingPreference: 'no_preference',
    selectedSites: [],
    optimisedGroups: [],
    
    // Calculated fields
    estimatedImpressions: 0,
    budgetBreakdown: {}
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  
  // Available personas from audience API
  const [availablePersonas, setAvailablePersonas] = useState([]);
  const [audienceData, setAudienceData] = useState([]); // Full audience data with state breakdown
  const [availableStates, setAvailableStates] = useState([]); // Malaysian states
  const [personaSearchQuery, setPersonaSearchQuery] = useState(''); // Search filter for personas
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false); // Loading state for personas
  
  // Audience group management
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  
  // Load saved audience modal
  const [showLoadAudienceModal, setShowLoadAudienceModal] = useState(false);
  const [savedAudienceGroups, setSavedAudienceGroups] = useState([]);
  const [isLoadingSavedGroups, setIsLoadingSavedGroups] = useState(false);
  
  // Save audience modal
  const [showSaveAudienceModal, setShowSaveAudienceModal] = useState(false);
  const [audienceGroupName, setAudienceGroupName] = useState('');
  const [isSavingAudience, setIsSavingAudience] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataMessage, setClearDataMessage] = useState('');
  const [clearDataCallback, setClearDataCallback] = useState(null);
  
  // Generic confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    type: 'info' // 'info', 'warning', 'danger'
  });
  
  // Filter dropdown states
  const [openDropdown, setOpenDropdown] = useState(null); // 'race', 'generation', 'income', or 'geography'
  
  // AI Recommendations state
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Formats data from API (replaces static AD_FORMATS)
  const [availableFormats, setAvailableFormats] = useState({});
  const [isLoadingFormats, setIsLoadingFormats] = useState(false);
  
  // Sites data from API (replaces static SITES_DATABASE)
  const [availableSites, setAvailableSites] = useState({});
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  
  // Format inventory data (for budget validation)
  const [formatInventory, setFormatInventory] = useState({});
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  
  // Budget Channel Allocations state (for Step 3)
  const [budgetChannels, setBudgetChannels] = useState([]);
  
  // Mobile AI Recommendations Panel visibility
  const [showMobileAI, setShowMobileAI] = useState(false);
  
  // Collapsible site channels state
  const [expandedChannels, setExpandedChannels] = useState({});
  
  // Auto-save indicator state
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  
  // Flag to trigger AI recommendations after loading campaign
  const [shouldFetchAI, setShouldFetchAI] = useState(false);
  
  // Format category filters state
  const [categoryFilters, setCategoryFilters] = useState({
    'Display & Native': true,
    'High Impact': true,
    'Video': true,
    'Interactive': true,
    'Social': true
  });
  
  // Save version dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAction, setSaveAction] = useState(null); // 'draft' or 'book'
  const [newVersionName, setNewVersionName] = useState('');
  
  // State for collapsible format sections (all collapsed by default)
  const [collapsedFormatSections, setCollapsedFormatSections] = useState({
    'High Impact': true,
    'Video': true,
    'Display & Native': true,
    'Lead & Performance': true,
    'Interactive': true,
    'Social': true
  });
  
  // Toggle collapse state for a format section
  const toggleFormatSection = (category) => {
    setCollapsedFormatSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Load campaign from location state if editing existing draft
  useEffect(() => {
    if (loadedCampaign) {
      console.log('📂 Loading existing campaign:', loadedCampaign.campaignName);
      console.log('📂 Campaign data:', {
        objective: loadedCampaign.objective,
        industry: loadedCampaign.industry,
        brandProduct: loadedCampaign.brandProduct,
        totalBudget: loadedCampaign.totalBudget
      });
      
      // Migration map for old format names to new format IDs
      const formatNameToId = {
        'masthead': 'fmt_6',
        'leaderboard': 'fmt_1',
        'mrec': 'fmt_2',
        'half page': 'fmt_3',
        'mobile banner': 'fmt_4',
        'large mobile banner': 'fmt_5',
        'instream': 'fmt_9', // In-stream Video
        'instream video': 'fmt_9',
        'in-stream video': 'fmt_9',
        'banner': 'fmt_1', // Default to Leaderboard
        'native': 'fmt_1', // Default to Leaderboard
        'interstitial': 'fmt_24'
      };
      
      // Migrate old format names to new format IDs
      const migrateFormatIds = (formats) => {
        if (!formats || formats.length === 0) return [];
        
        const migrated = formats.map(format => {
          // If it's already a format ID (starts with fmt_), keep it
          if (typeof format === 'string' && format.startsWith('fmt_')) {
            console.log(`✅ Keeping format ID: ${format}`);
            return format;
          }
          // Otherwise, try to map it
          const normalized = format.toLowerCase();
          const newId = formatNameToId[normalized] || format;
          console.log(`🔄 Migrating format: "${format}" → "${newId}"`);
          return newId;
        });
        
        console.log('📦 Migration complete:', { original: formats, migrated });
        return migrated;
      };
      
      // Load campaign data into state
      const loadedPlan = {
        ...loadedCampaign,
        // Ensure arrays exist
        selectedPersonas: loadedCampaign.selectedPersonas || [],
        selectedFormats: migrateFormatIds(loadedCampaign.selectedFormats),
        selectedSites: loadedCampaign.selectedSites || [],
        optimisedGroups: loadedCampaign.optimisedGroups || [],
        selectedStates: loadedCampaign.selectedStates || [],
        audienceGroups: loadedCampaign.audienceGroups || [],
        // Ensure new fields have defaults (for campaigns saved before these fields existed)
        massTargeting: loadedCampaign.massTargeting ?? false,
        targetLanguages: loadedCampaign.targetLanguages || [],
        // Ensure demographicFilters exists with default structure
        demographicFilters: loadedCampaign.demographicFilters || {
          race: [],
          generation: [],
          income: []
        }
      };
      console.log('📂 Setting campaignPlan state to:', {
        campaignName: loadedPlan.campaignName,
        objective: loadedPlan.objective,
        industry: loadedPlan.industry,
        brandProduct: loadedPlan.brandProduct,
        selectedFormats: loadedPlan.selectedFormats
      });
      console.log('📂 Selected formats from saved campaign:', loadedPlan.selectedFormats);
      console.log('🔧 About to call setCampaignPlan with migrated formats');
      setCampaignPlan(loadedPlan);
      console.log('✅ setCampaignPlan called successfully');
      
      // Load budget channels if they exist
      if (loadedCampaign.budgetChannels && loadedCampaign.budgetChannels.length > 0) {
        setBudgetChannels(loadedCampaign.budgetChannels);
      }
      
      // Set to the step where they left off, or step 1
      const stepToLoad = loadedCampaign.currentStep || 1;
      setCurrentStep(stepToLoad);
      
      // Mark all previous steps as completed so user can navigate back
      if (stepToLoad > 1) {
        const previousSteps = Array.from({ length: stepToLoad - 1 }, (_, i) => i + 1);
        setCompletedSteps(previousSteps);
        console.log('✅ Marked steps as completed:', previousSteps);
      }
      
      // Load category filters if they exist
      if (loadedCampaign.categoryFilters) {
        setCategoryFilters(loadedCampaign.categoryFilters);
      }
      
      // AI recommendations will be fetched automatically by the useEffect watching campaignPlan changes
      console.log('📂 Campaign loaded at step', stepToLoad);
    }
  }, [loadedCampaign]);
  
  // Load audience group from Audience Segments page
  useEffect(() => {
    const audienceGroup = location.state?.audienceGroup;
    const fromAudienceSegments = location.state?.fromAudienceSegments;
    
    if (audienceGroup && fromAudienceSegments) {
      console.log('👥 Loading audience group from Audience Segments:', audienceGroup.name);
      console.log('📊 Audience group data:', {
        personas: audienceGroup.personas,
        reach: audienceGroup.uniqueReach,
        industry: audienceGroup.industry,
        objective: audienceGroup.objective
      });
      
      // Apply the audience group to Step 2
      setCampaignPlan(prev => ({
        ...prev,
        // Auto-fill from audience group metadata
        industry: audienceGroup.industry || prev.industry,
        objective: audienceGroup.objective || prev.objective,
        // Apply personas
        selectedPersonas: audienceGroup.personas || [],
        massTargeting: false,
        // Apply demographics if available
        demographicFilters: audienceGroup.demographics || prev.demographicFilters
      }));
      
      // Navigate to Step 2 (Audience)
      setCurrentStep(2);
      
      // Show success notification
      console.log(`✅ Loaded ${audienceGroup.personas?.length || 0} personas from "${audienceGroup.name}"`);
      
      // Clear the location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Auto-save functionality (every 30 seconds)
  useEffect(() => {
    // Only auto-save if campaign has a name and ID (already saved once)
    if (!campaignPlan.campaignName || !campaignPlan.id) {
      return;
    }
    
    const autoSaveInterval = setInterval(async () => {
      try {
        setAutoSaveStatus('saving');
        console.log('💾 Auto-saving campaign...');
        
        await axios.put(`/api/campaigns/${campaignPlan.id}`, {
          campaignPlan: {
            ...campaignPlan,
            budgetChannels,
            currentStep,
            categoryFilters
          },
          status: campaignPlan.status || 'draft'
        });
        
        setAutoSaveStatus('saved');
        setLastSaved(new Date());
        console.log('✅ Auto-save successful');
      } catch (error) {
        setAutoSaveStatus('error');
        console.error('❌ Auto-save failed:', error);
      }
    }, 30000); // 30 seconds
    
    // Cleanup interval on unmount
    return () => clearInterval(autoSaveInterval);
  }, [campaignPlan, budgetChannels, currentStep, categoryFilters]);
  
  // Load personas and states from API
  useEffect(() => {
    setIsLoadingPersonas(true);
    fetch('/api/audience')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Store full audience data for overlap calculations
          setAudienceData(data.data);
          
          // Extract state columns from headers
          const states = data.headers.filter(h => h !== 'Personas');
          setAvailableStates(states);
          
          // Create persona list with national totals
          const personas = data.data.map(item => ({
            name: item.Personas,
            category: getPersonaCategory(item.Personas),
            size: calculateNationalTotal(item)
          }));
          setAvailablePersonas(personas);
          console.log('✅ Loaded', personas.length, 'personas');
        }
      })
      .catch(err => {
        console.error('❌ Error loading personas:', err);
      })
      .finally(() => {
        setIsLoadingPersonas(false);
      });
  }, []);
  
  // Load formats from API (replaces static AD_FORMATS)
  useEffect(() => {
    setIsLoadingFormats(true);
    fetch('/api/formats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Group formats by type for display
          const grouped = {};
          data.data.forEach(format => {
            if (!format.active) return; // Skip inactive formats
            
            // Map format types to categories
            let category = 'Display & Native';
            const typeLower = (format.type || '').toLowerCase();
            const goalLower = (format.goal || '').toLowerCase();
            const nameLower = (format.name || '').toLowerCase();
            
            // Check for Social formats first (highest priority - includes both static and video social)
            if (nameLower.includes('social ad') || nameLower.includes('social video')) {
              category = 'Social';
            } else if (typeLower.includes('high impact')) {
              category = 'High Impact';
            } else if (typeLower.includes('video') || typeLower.includes('instream')) {
              category = 'Video';
            } else if (typeLower.includes('interactive') || goalLower.includes('lead') || goalLower.includes('conversion')) {
              category = 'Interactive';
            } else if (goalLower.includes('lead') || goalLower.includes('form') || goalLower.includes('capture')) {
              category = 'Lead & Performance';
            }
            
            if (!grouped[category]) {
              grouped[category] = [];
            }
            
            grouped[category].push({
              id: format.id,
              name: format.name,
              description: format.description || 'Premium ad format',
              bestFor: format.goal || 'Various campaign objectives',
              tags: (format.goal || 'Awareness').split(/[,&+/]/).map(t => t.trim()).filter(t => t),
              cpm: format.baseCpm,
              type: format.type
            });
          });
          
          setAvailableFormats(grouped);
          
          // Debug: Log all format IDs after loading
          const allFormatIds = [];
          Object.values(grouped).forEach(categoryFormats => {
            categoryFormats.forEach(f => allFormatIds.push(f.id));
          });
          console.log('📋 Loaded formats from API:', {
            totalFormats: allFormatIds.length,
            formatIds: allFormatIds,
            currentSelectedFormats: campaignPlan.selectedFormats
          });
        }
      })
      .catch(err => {
        console.error('Error loading formats:', err);
        // Fallback to static data if API fails
        setAvailableFormats(AD_FORMATS);
      })
      .finally(() => setIsLoadingFormats(false));
  }, [campaignPlan.selectedFormats]);
  
  // Load sites from API (replaces static SITES_DATABASE)
  useEffect(() => {
    setIsLoadingSites(true);
    fetch('/api/sites')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Merge API data with static Social platforms (API doesn't have proper Social data yet)
          const mergedSites = {
            ...data.data,
            // Override Social section with hardcoded Facebook, Instagram, TikTok
            Social: SITES_DATABASE.Social
          };
          setAvailableSites(mergedSites);
          console.log('✅ Loaded sites from inventory:', data.total, 'sites (Social platforms from static data)');
          console.log('📊 Sites breakdown:', {
            OTT: (mergedSites.OTT || []).length + ' sites',
            Web: (mergedSites.Web || []).length + ' sites',
            Social: (mergedSites.Social || []).length + ' sites'
          });
          console.log('📝 OTT sites:', (mergedSites.OTT || []).map(s => s.name).join(', '));
          console.log('📝 Web sites:', (mergedSites.Web || []).map(s => s.name).join(', '));
          console.log('📝 Social sites:', (mergedSites.Social || []).map(s => s.name).join(', '));
        }
      })
      .catch(err => {
        console.error('❌ Error loading sites:', err);
        // Fallback to static data if API fails
        setAvailableSites(SITES_DATABASE);
      })
      .finally(() => setIsLoadingSites(false));
  }, []);
  
  // Load format inventory data for budget validation
  useEffect(() => {
    setIsLoadingInventory(true);
    fetch('/api/inventory/by-format')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.formats) {
          // Create a map of format name to inventory data for easy lookup
          const inventoryMap = {};
          data.formats.forEach(fmt => {
            const formatKey = fmt.formatName.toLowerCase();
            inventoryMap[formatKey] = {
              avgMonthlyRequests: fmt.avgMonthlyRequests,
              avgMonthlyImpressions: fmt.avgMonthlyImpressions,
              byLanguage: fmt.byLanguage,
              byProperty: fmt.byProperty
            };
          });
          setFormatInventory(inventoryMap);
          console.log('✅ Loaded format inventory for', Object.keys(inventoryMap).length, 'formats');
        }
      })
      .catch(err => {
        console.error('❌ Error loading format inventory:', err);
      })
      .finally(() => setIsLoadingInventory(false));
  }, []);
  
  const calculateNationalTotal = (audienceData) => {
    const stateKeys = Object.keys(audienceData).filter(key => 
      !['Personas', 'Category', '_id'].includes(key)
    );
    
    let total = 0;
    stateKeys.forEach(state => {
      const value = audienceData[state];
      if (value && typeof value === 'string') {
        total += parseInt(value.replace(/,/g, ''), 10) || 0;
      }
    });
    
    return total;
  };

  // Auto-save on plan changes
  useEffect(() => {
    localStorage.setItem('kult_wizard_draft', JSON.stringify(campaignPlan));
  }, [campaignPlan]);
  
  // Load draft from localStorage ONLY if not loading an existing campaign
  useEffect(() => {
    // Don't load localStorage draft if we're loading an existing campaign
    if (loadedCampaign) {
      console.log('📂 Skipping localStorage draft - loading existing campaign instead');
      return;
    }
    
    const draft = localStorage.getItem('kult_wizard_draft');
    if (draft) {
      try {
        console.log('📂 Loading draft from localStorage');
        setCampaignPlan(JSON.parse(draft));
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [loadedCampaign]);
  
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
  
  // Load saved audience groups on mount
  useEffect(() => {
    loadSavedAudienceGroups();
  }, []);
  
  // Function to load saved audience groups
  const loadSavedAudienceGroups = async () => {
    setIsLoadingSavedGroups(true);
    try {
      const response = await axios.get('/api/audience-groups');
      if (response.data.success) {
        setSavedAudienceGroups(response.data.data || []);
        console.log('✅ Loaded', response.data.data?.length || 0, 'saved audience groups');
      }
    } catch (error) {
      console.error('Error loading audience groups:', error);
      // Fallback to localStorage
      const localGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      setSavedAudienceGroups(localGroups);
    } finally {
      setIsLoadingSavedGroups(false);
    }
  };
  
  // Function to save current audience selection as a group
  const handleSaveAudienceGroup = async () => {
    if (!audienceGroupName.trim()) {
      alert('Please enter a name for this audience group');
      return;
    }
    
    if (campaignPlan.selectedPersonas.length === 0) {
      alert('Please select at least one persona before saving');
      return;
    }
    
    setIsSavingAudience(true);
    
    try {
      // Calculate total reach for selected personas
      const totalReach = campaignPlan.selectedPersonas.reduce((sum, personaName) => {
        const audienceItem = audienceData.find(a => a.name === personaName);
        if (audienceItem) {
          // Sum all state values
          const stateKeys = Object.keys(audienceItem).filter(key => 
            key !== 'id' && key !== 'name' && key !== 'description' && key !== 'category'
          );
          const personaTotal = stateKeys.reduce((stateSum, state) => {
            const value = audienceItem[state];
            return stateSum + (typeof value === 'number' ? value : 0);
          }, 0);
          return sum + personaTotal;
        }
        return sum;
      }, 0);
      
      const audienceGroup = {
        id: `aud_group_${Date.now()}`,
        name: audienceGroupName.trim(),
        personas: campaignPlan.selectedPersonas,
        uniqueReach: totalReach,
        totalAudience: totalReach,
        industry: campaignPlan.industry || null,
        objective: campaignPlan.objective || null,
        geography: campaignPlan.selectedStates.join(', ') || 'Malaysia',
        demographics: campaignPlan.demographicFilters || { race: [], generation: [], income: [] },
        createdBy: JSON.parse(localStorage.getItem('user') || '{}').email || 'User',
        createdAt: new Date().toISOString(),
        source: 'campaign_wizard'
      };
      
      // Save to API
      const response = await axios.post('/api/audience-groups', audienceGroup);
      
      if (response.data.success) {
        console.log('✅ Audience group saved:', audienceGroup.name);
        
        // Refresh the list
        await loadSavedAudienceGroups();
        
        // Close modal and reset
        setShowSaveAudienceModal(false);
        setAudienceGroupName('');
        
        // Show success message
        alert(`Audience group "${audienceGroup.name}" saved successfully!`);
      }
    } catch (error) {
      console.error('Error saving audience group:', error);
      alert('Failed to save audience group. Please try again.');
    } finally {
      setIsSavingAudience(false);
    }
  };
  
  // Function to load a saved audience group
  const handleLoadAudienceGroup = (group) => {
    setCampaignPlan(prev => ({
      ...prev,
      selectedPersonas: group.personas || [],
      industry: group.industry || prev.industry,
      objective: group.objective || prev.objective,
      demographicFilters: group.demographics || { race: [], generation: [], income: [] }
    }));
    
    setShowLoadAudienceModal(false);
    console.log('✅ Loaded audience group:', group.name, 'with', group.personas.length, 'personas');
    alert(`Audience group "${group.name}" loaded successfully!`);
  };
  
  // Function to delete an audience group
  const handleDeleteAudienceGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this audience group?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/audience-groups/${groupId}`);
      
      // Refresh the list
      await loadSavedAudienceGroups();
      
      console.log('✅ Deleted audience group:', groupId);
    } catch (error) {
      console.error('Error deleting audience group:', error);
      alert('Failed to delete audience group. Please try again.');
    }
  };

  // Dynamically recalculate 100% Loading when site selections or optimize settings change
  useEffect(() => {
    console.log('🔄 USEEFFECT TRIGGERED:', JSON.stringify({
      'budgetChannels.length': budgetChannels.length,
      'budgetChannels.names': budgetChannels.map(ch => ch.name),
      'optimisedGroups': campaignPlan.optimisedGroups
    }, null, 2));
    
    // Only recalculate if we have budget channels
    if (budgetChannels.length === 0) return;
    
    // Skip if channels don't have required properties (loading from saved campaign)
    const hasRequiredProps = budgetChannels.every(ch => 
      ch.hasOwnProperty('cpm') && ch.hasOwnProperty('budget') && ch.hasOwnProperty('impressions')
    );
    if (!hasRequiredProps) {
      console.log('⚠️ Skipping loading recalculation - channels missing required properties');
      return;
    }
    
    // Get all sites from availableSites or SITES_DATABASE
    const allSites = Object.keys(availableSites).length > 0 
      ? Object.values(availableSites).flat() 
      : Object.values(SITES_DATABASE).flat();
    
    // Helper function to determine channel category from channel object
    const getChannelCategory = (channel) => {
      const nameLower = channel.name.toLowerCase();
      const idLower = channel.id.toLowerCase();
      
      // Check OTT (includes Video channels)
      if (nameLower.includes('ott') || nameLower.includes('video') || 
          idLower.includes('ott') || idLower.includes('video')) {
        return 'OTT';
      }
      
      // Check Web/Display/Interactive
      if (nameLower.includes('web') || nameLower.includes('display') || 
          nameLower.includes('interactive') || // Add interactive check
          idLower.includes('web') || idLower.includes('display') || 
          idLower.includes('interactive')) { // Add interactive check
        return 'Web';
      }
      
      // Check Social
      if (nameLower.includes('social') || idLower.includes('social')) {
        return 'Social';
      }
      
      // Default to Web for unknown types
      return 'Web';
    };
    
    // Check if any channel needs updating
    const needsUpdate = budgetChannels.some(channel => {
      const channelCategory = getChannelCategory(channel);
      const isOptimized = campaignPlan.optimisedGroups.includes(channelCategory);
      // Social channels NEVER get loading (always use base rate)
      const shouldHaveLoading = channelCategory !== 'Social' && !isOptimized;
      
      console.log(`🔍 NEEDS UPDATE CHECK for ${channel.name}:`, JSON.stringify({
        channelCategory,
        'optimisedGroups': campaignPlan.optimisedGroups,
        isOptimized,
        shouldHaveLoading,
        'channel.hasLoading': channel.hasLoading,
        'needsUpdate': channel.hasLoading !== shouldHaveLoading
      }, null, 2));
      
      return channel.hasLoading !== shouldHaveLoading;
    });
    
    // Only proceed if updates are needed
    if (!needsUpdate) return;
    
    // Update budget channels with new loading status
    const updatedChannels = budgetChannels.map(channel => {
      const channelCategory = getChannelCategory(channel);
      const isOptimized = campaignPlan.optimisedGroups.includes(channelCategory);
      // Social channels NEVER get loading (always use base rate)
      const shouldHaveLoading = channelCategory !== 'Social' && !isOptimized;
      
      // If loading status changed, recalculate
      if (channel.hasLoading !== shouldHaveLoading) {
        // Use stored baseCpm and baseBudget if available, otherwise derive from current values
        // This handles both new channels (with stored base) and loaded campaigns (without stored base)
        const baseCpm = channel.baseCpm || (channel.hasLoading ? channel.cpm / 2 : channel.cpm);
        const baseBudget = channel.baseBudget || (channel.hasLoading ? channel.budget / 2 : channel.budget);
        
        console.log(`🔍 RECALC DEBUG for ${channel.name}:`, JSON.stringify({
          'channel.baseCpm': channel.baseCpm,
          'channel.cpm': channel.cpm,
          'channel.hasLoading': channel.hasLoading,
          'calculated baseCpm': baseCpm,
          'shouldHaveLoading': shouldHaveLoading
        }, null, 2));
        
        // Apply 100% loading if needed (double both CPM and budget)
        const newCpm = shouldHaveLoading ? baseCpm * 2 : baseCpm;
        const newBudget = shouldHaveLoading ? baseBudget * 2 : baseBudget;
        const newImpressions = Math.round((newBudget / newCpm) * 1000);
        
        console.log(`🔄 Loading ${shouldHaveLoading ? 'APPLIED' : 'REMOVED'} for ${channel.name}: CPM ${channel.cpm || 'N/A'} → ${newCpm}, Budget RM ${(channel.budget || 0).toLocaleString()} → RM ${newBudget.toLocaleString()}`);
        
        return {
          ...channel,
          hasLoading: shouldHaveLoading,
          baseCpm, // Store/preserve the base CPM for future recalculations
          baseBudget, // Store/preserve the base budget for future recalculations
          cpm: newCpm,
          budget: newBudget,
          impressions: newImpressions
        };
      }
      
      return channel;
    });
    
    console.log('✨ Recalculated loading for all channels');
    setBudgetChannels(updatedChannels);
    
  }, [
    campaignPlan.selectedSites.join(','), 
    campaignPlan.optimisedGroups.join(',')
  ]); // Watch the actual values, not just lengths

  // Wizard navigation
  const steps = [
    { 
      num: 1, 
      name: 'Campaign Info', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      num: 2, 
      name: 'Audience', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      num: 3, 
      name: 'Formats', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    },
    { 
      num: 4, 
      name: 'Budget', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      num: 5, 
      name: 'Summary', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const canNavigateToStep = (stepNum) => {
    if (stepNum <= currentStep) return true;
    if (completedSteps.includes(stepNum - 1)) return true;
    return false;
  };

  // Helper function to calculate persona targeting ratio
  const calculatePersonaRatio = () => {
    // If mass targeting is enabled, return 100% (no persona filtering)
    if (campaignPlan.massTargeting) {
      return 1.0; // 100% of inventory
    }

    // If no personas selected, return 100%
    if (!campaignPlan.selectedPersonas || campaignPlan.selectedPersonas.length === 0) {
      return 1.0;
    }

    // Base population: 16.15M (total Malaysian digital audience)
    const BASE_POPULATION = 16150000;
    
    // Calculate total reach of selected personas
    let totalReach = 0;
    campaignPlan.selectedPersonas.forEach(personaName => {
      const persona = availablePersonas.find(p => p.name === personaName);
      if (persona && persona.size) {
        totalReach += persona.size;
      }
    });

    // Calculate ratio (e.g., 3.5M / 16.15M = 21.67%)
    const ratio = totalReach / BASE_POPULATION;
    
    console.log('🎯 Persona Targeting Ratio:', {
      selectedPersonas: campaignPlan.selectedPersonas,
      totalReach: totalReach.toLocaleString(),
      basePopulation: BASE_POPULATION.toLocaleString(),
      ratio: `${(ratio * 100).toFixed(1)}%`
    });

    return ratio;
  };

  // Helper function to calculate available inventory for selected formats
  const calculateAvailableInventory = () => {
    if (!campaignPlan.selectedFormats || campaignPlan.selectedFormats.length === 0) {
      return { totalRequests: 0, totalImpressions: 0, availableInventory: 0, formats: [], personaRatio: 1.0 };
    }

    const selectedLanguages = (campaignPlan.targetLanguages || []).map(l => l.toLowerCase());
    const allLanguages = ['bahasa malaysia', 'english', 'chinese'];
    
    // Check if all languages are selected (treat as mass targeting - no language filter)
    const isAllLanguagesSelected = allLanguages.every(lang => 
      selectedLanguages.some(sl => sl.includes(lang.split(' ')[0]))
    );
    
    let totalRequests = 0;
    let totalImpressions = 0;
    const formatDetails = [];
    
    // Calculate persona targeting ratio
    const personaRatio = calculatePersonaRatio();

    campaignPlan.selectedFormats.forEach(formatId => {
      // Find format details from availableFormats
      const formatInfo = Object.values(availableFormats || {})
        .flat()
        .find(f => f.id === formatId || f.name.toLowerCase().includes(formatId));

      if (!formatInfo) return;

      // Map format names to inventory keys (handle variations)
      let inventoryKey = formatInfo.name.toLowerCase();
      
      // Special mappings for inventory lookup
      const formatMappings = {
        'leaderboard': 'leaderboard',
        'mrec': 'mrec',
        'masthead': 'masthead',
        'half page': 'mrec',
        'mobile banner': 'leaderboard',
        'interstitial': 'interstitial',
        'in-article': 'in article',
        'in-image': 'in image',
        'catfish': 'catfish',
        'instream video': 'pre/midroll',
        'in-stream video': 'pre/midroll',
        'pre-roll': 'preroll',
        'mid-roll': 'midroll',
        'image social ad': 'social static ad',
        'video social ad': 'social video ad',
        // High-impact formats share inventory
        'skinner': 'masthead',
        'wallpaper': 'masthead',
        'takeover': 'interstitial'
      };
      
      // Check if this is an interactive format (combines multiple inventories)
      const formatType = (formatInfo.type || '').toLowerCase();
      const isInteractive = formatType.includes('interactive');
      let inventory = null;
      let useMultipleInventories = false;
      
      if (isInteractive) {
        // Interactive formats use combined inventory from 6 digital sizes
        useMultipleInventories = true;
      } else {
        // Try exact match first, then check mappings
        inventory = formatInventory[inventoryKey];
        if (!inventory) {
          // Try mappings
          for (const [key, value] of Object.entries(formatMappings)) {
            if (inventoryKey.includes(key)) {
              inventory = formatInventory[value];
              break;
            }
          }
        }
      }

      if (!inventory && !useMultipleInventories) {
        console.warn(`⚠️ No inventory data found for format: ${formatInfo.name}`);
        return;
      }

      // Calculate inventory based on selected languages
      let formatRequests = 0;
      let formatImpressions = 0;

      if (useMultipleInventories) {
        // Interactive formats: combine inventory from multiple standard formats
        const interactiveInventoryKeys = ['leaderboard', 'mrec', 'masthead', 'interstitial', 'catfish', 'in article'];
        interactiveInventoryKeys.forEach(key => {
          const inv = formatInventory[key];
          if (inv) {
            if (selectedLanguages.length === 0 || isAllLanguagesSelected) {
              formatRequests += inv.avgMonthlyRequests;
              formatImpressions += inv.avgMonthlyImpressions;
            } else {
              inv.byLanguage.forEach(langData => {
                const langKey = langData.language.toLowerCase();
                if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
                  formatRequests += langData.totalRequests / 12;
                  formatImpressions += langData.totalImpressions / 12;
                }
              });
            }
          }
        });
      } else {
        // Single inventory source
        // If NO languages selected OR ALL languages selected, use total inventory (mass targeting)
        if (selectedLanguages.length === 0 || isAllLanguagesSelected) {
          // Mass targeting - use total inventory without language filter
          formatRequests = inventory.avgMonthlyRequests;
          formatImpressions = inventory.avgMonthlyImpressions;
        } else {
          // Specific language(s) selected - filter by language
          inventory.byLanguage.forEach(langData => {
            const langKey = langData.language.toLowerCase();
            if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
              // Use the raw total divided by 12 months for consistency with backend
              // Backend divides by 12 (MONTHS_IN_YEAR) for avgMonthly calculations
              formatRequests += langData.totalRequests / 12;
              formatImpressions += langData.totalImpressions / 12;
            }
          });
        }
      }

      totalRequests += formatRequests;
      totalImpressions += formatImpressions;

      // Apply 75% safety buffer (show only 25% of capacity) to avoid overbooking
      const rawAvailable = formatRequests - formatImpressions;
      const safeAvailable = rawAvailable * 0.25;
      
      // Apply persona targeting ratio (e.g., Entertainment = 21% of base)
      const personaTargetedAvailable = safeAvailable * personaRatio;
      
      formatDetails.push({
        name: formatInfo.name,
        avgMonthlyRequests: Math.round(formatRequests),
        avgMonthlyImpressions: Math.round(formatImpressions),
        availableInventory: Math.round(personaTargetedAvailable)
      });
    });

    // Apply 75% safety buffer to total available inventory (show only 25%)
    const rawTotalAvailable = totalRequests - totalImpressions;
    const safeTotalAvailable = rawTotalAvailable * 0.25;
    
    // Apply persona targeting ratio
    const personaTargetedTotal = safeTotalAvailable * personaRatio;

    return {
      totalRequests: Math.round(totalRequests),
      totalImpressions: Math.round(totalImpressions),
      availableInventory: Math.round(personaTargetedTotal), // Available = (Requests - Impressions) * 25% * PersonaRatio
      formats: formatDetails,
      personaRatio: personaRatio
    };
  };

  const validateCurrentStep = () => {
    const newErrors = {};
    
    switch (currentStep) {
      case 1: // Campaign Info
        if (!campaignPlan.objective) {
          newErrors.objective = 'Please select a primary objective';
        }
        if (!campaignPlan.industry) {
          newErrors.industry = 'Please select an industry';
        }
        if (!campaignPlan.campaignName) {
          newErrors.campaignName = 'Give this campaign a name so you can find it easily later';
        }
        break;
        
      case 2: // Audience + Geography
        if (campaignPlan.selectedPersonas.length === 0) {
          newErrors.personas = 'Please select at least 1 persona';
        }
        // Geographic targeting is optional - if no states selected, we assume nationwide
        break;
        
      case 3: // Formats (moved before budget)
        if (campaignPlan.selectedFormats.length === 0) {
          newErrors.formats = 'Please select at least 1 format';
        }
        // Check for awareness + only small display
        if (campaignPlan.objective === 'Awareness') {
          const hasHighImpactOrVideo = campaignPlan.selectedFormats.some(fId => {
            // Masthead (fmt_6), Site Takeover (fmt_8), Skinner/Wallpaper (fmt_7), In-stream Video (fmt_9), In-Read Video (fmt_10)
            return ['fmt_6', 'fmt_8', 'fmt_7', 'fmt_9', 'fmt_10'].includes(fId);
          });
          if (!hasHighImpactOrVideo && campaignPlan.selectedFormats.length === 1) {
            newErrors.formatsWarning = 'For awareness campaigns, add at least one video or high-impact format for meaningful visibility';
          }
        }
        break;
        
      case 4: // Budget + Sites (combined)
        const budget = parseFloat(campaignPlan.totalBudget);
        if (!campaignPlan.totalBudget || isNaN(budget) || budget <= 0) {
          newErrors.totalBudget = 'Please enter a budget greater than 0';
        }
        
        // Check if budget is over-allocated
        if (budget > 0 && budgetChannels.length > 0) {
          const allocatedBudget = budgetChannels.reduce((sum, ch) => sum + (parseFloat(ch.budget) || 0), 0);
          const remainingBudget = budget - allocatedBudget;
          
          if (remainingBudget < 0) {
            // Over budget - blocking error
            newErrors.budgetAllocation = `Budget over-allocated by RM ${Math.abs(remainingBudget).toLocaleString()}. Please reduce channel budgets or increase total budget.`;
          }
        }
        
        // Check budget against available inventory
        if (budget > 0) {
          const inventory = calculateAvailableInventory();
          
          // Estimate if budget is feasible based on CPM and available inventory
          // Average CPM is around RM 3-10, let's use RM 5 as baseline
          const estimatedCPM = 5;
          const requestedImpressions = (budget / estimatedCPM) * 1000; // budget / CPM * 1000
          
          // Use available inventory (requests - impressions already served) for validation
          const availableInv = inventory.availableInventory;
          
          // If requested impressions exceed available inventory by a large margin
          if (availableInv > 0 && requestedImpressions > availableInv * 0.8) {
            const capacityPercentage = Math.round((availableInv * estimatedCPM / 1000) / budget * 100);
            
            if (capacityPercentage < 20) {
              // Critical: Inventory is too low for this budget
              newErrors.totalBudget = `Selected formats have insufficient available inventory (${(availableInv / 1000000).toFixed(1)}M available). This budget would require ~${(requestedImpressions / 1000000).toFixed(1)}M impressions. Please select formats with more inventory or reduce your budget to RM ${Math.round(availableInv * estimatedCPM / 1000 / 1000) * 1000}.`;
            } else if (capacityPercentage < 50) {
              // Warning: Limited inventory
              newErrors.budgetWarning = `Limited inventory alert: Selected formats have ~${(availableInv / 1000000).toFixed(1)}M available inventory. Consider selecting additional formats with higher inventory for optimal delivery.`;
            }
          }
          
          // Existing budget warning for low budgets
          if (budget < 20000 && !newErrors.budgetWarning && !newErrors.totalBudget) {
            newErrors.budgetWarning = 'Budgets under RM 20k may limit the number of channels and formats we can use';
          }
        }
        
        if (campaignPlan.selectedSites.length === 0 && campaignPlan.optimisedGroups.length === 0) {
          newErrors.sites = 'Please select at least 1 site or enable 1 optimised group';
        }
        break;
    }
    
    setErrors(newErrors);
    
    // Only block if there are hard errors (not warnings)
    const hasBlockingErrors = Object.keys(newErrors).some(key => !key.includes('Warning'));
    return !hasBlockingErrors;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      
      // If on Step 5 (final step), trigger Book Now action
      if (currentStep === 5) {
        handleBookNow();
      } else if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      console.log('🔙 Navigating back from step', currentStep, 'to', currentStep - 1);
      console.log('📊 Available personas count:', availablePersonas.length);
      console.log('📊 Campaign plan state:', {
        personas: campaignPlan.selectedPersonas.length,
        formats: campaignPlan.selectedFormats.length,
        sites: campaignPlan.selectedSites.length
      });
      setCurrentStep(currentStep - 1);
      setErrors({});
      window.scrollTo(0, 0);
    }
  };

  const handleStepClick = (stepNum) => {
    console.log(`🔘 Step ${stepNum} clicked. Current step: ${currentStep}`);
    
    if (canNavigateToStep(stepNum)) {
      // If going back to a previous step, show confirmation dialog (except for step 4 from step 5)
      if (stepNum < currentStep) {
        console.log(`⬅️ Going back from step ${currentStep} to ${stepNum}`);
        
        // Determine what data will be cleared
        let warningMessage = '';
        if (stepNum === 1) {
          warningMessage = 'Going back to Campaign Info will clear all selections (Audiences, Formats, Sites, and Budget channels).';
        } else if (stepNum === 2) {
          warningMessage = 'Going back to Audiences will clear Formats, Sites, and Budget channels.';
        } else if (stepNum === 3) {
          warningMessage = 'Going back to Formats will clear Sites and Budget channels.';
        }
        // Note: Going back to step 4 from step 5 doesn't require a warning (step 5 is just summary)
        
        if (warningMessage) {
          showConfirm({
            title: 'Warning',
            message: `${warningMessage}\n\nDo you want to continue?`,
            confirmText: 'Continue',
            cancelText: 'Cancel',
            type: 'warning',
            onConfirm: () => {
              clearDownstreamData(stepNum);
              setCurrentStep(stepNum);
              setErrors({});
              window.scrollTo(0, 0);
            }
          });
        } else {
          // No warning needed (e.g., going from step 5 to step 4)
          clearDownstreamData(stepNum);
          setCurrentStep(stepNum);
          setErrors({});
          window.scrollTo(0, 0);
        }
      } else {
        // Going forward, no warning needed
        setCurrentStep(stepNum);
        setErrors({});
        window.scrollTo(0, 0);
      }
    } else {
      console.log(`❌ Cannot navigate to step ${stepNum}`);
    }
  };
  
  // Clear data from steps after the target step
  const clearDownstreamData = (targetStep) => {
    console.log(`🗑️ Clearing data from steps after step ${targetStep}`);
    
    // Step 1: Campaign Info - clear everything after
    if (targetStep === 1) {
      updatePlan({
        selectedPersonas: [],
        demographicFilters: {
          race: [],
          generation: [],
          income: []
        },
        selectedStates: [],
        selectedFormats: [],
        selectedSites: [],
        optimisedGroups: []
      });
      setBudgetChannels([]);
      setCompletedSteps(completedSteps.filter(s => s <= 1));
    }
    // Step 2: Audience - clear formats, sites, budget
    else if (targetStep === 2) {
      updatePlan({
        selectedFormats: [],
        selectedSites: [],
        optimisedGroups: []
      });
      setBudgetChannels([]);
      setCompletedSteps(completedSteps.filter(s => s <= 2));
    }
    // Step 3: Formats - clear sites and budget
    else if (targetStep === 3) {
      updatePlan({
        selectedSites: [],
        optimisedGroups: []
      });
      setBudgetChannels([]);
      setCompletedSteps(completedSteps.filter(s => s <= 3));
    }
    // Step 4: Sites & Budget - clear nothing (last data step)
    else if (targetStep === 4) {
      setCompletedSteps(completedSteps.filter(s => s <= 4));
    }
  };

  // Helper function to show custom confirm dialog
  const showConfirm = ({ title, message, confirmText = 'OK', cancelText = 'Cancel', type = 'info', onConfirm }) => {
    return new Promise((resolve) => {
      setConfirmModalConfig({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setShowConfirmModal(false);
          resolve(true);
          if (onConfirm) onConfirm();
        },
        onCancel: () => {
          setShowConfirmModal(false);
          resolve(false);
        }
      });
      setShowConfirmModal(true);
    });
  };

  // Filter sites based on campaign selections (personas, industry, formats)
  const getFilteredSites = () => {
    const { selectedPersonas, industry, selectedFormats, objective } = campaignPlan;
    
    console.log('🔍 Site Filtering - Selected Formats:', selectedFormats);
    console.log('🔍 Site Filtering - Full campaignPlan:', campaignPlan);
    
    // Use real sites from API if available, fallback to static
    const sitesData = Object.keys(availableSites).length > 0 ? availableSites : SITES_DATABASE;
    
    // Create a scoring system for each site
    const scoredSites = {};
    
    Object.entries(sitesData).forEach(([channel, sites]) => {
      scoredSites[channel] = sites.map(site => {
        let score = 0;
        let reasons = [];
        
        // Score based on persona match (tags overlap)
        if (selectedPersonas.length > 0) {
          const personaKeywords = selectedPersonas.join(' ').toLowerCase();
          const siteTagsLower = (site.tags || []).join(' ').toLowerCase();
          
          // Check for persona-related keywords
          if (personaKeywords.includes('youth') && siteTagsLower.includes('youth')) {
            score += 20;
            reasons.push('Youth audience');
          }
          if (personaKeywords.includes('women') && siteTagsLower.includes('women')) {
            score += 20;
            reasons.push('Women audience');
          }
          if (personaKeywords.includes('family') && (siteTagsLower.includes('entertainment') || siteTagsLower.includes('lifestyle'))) {
            score += 15;
            reasons.push('Family-friendly');
          }
          if (personaKeywords.includes('automotive') && (siteTagsLower.includes('sports') || siteTagsLower.includes('news'))) {
            score += 15;
            reasons.push('Automotive audience');
          }
          
          // General tag overlap
          (site.tags || []).forEach(tag => {
            if (personaKeywords.includes(tag.toLowerCase())) {
              score += 5;
            }
          });
        }
        
        // Score based on industry match
        if (industry) {
          const industryLower = industry.toLowerCase();
          const siteTagsLower = (site.tags || []).join(' ').toLowerCase();
          
          if (industryLower.includes('automotive') && (siteTagsLower.includes('sports') || siteTagsLower.includes('news'))) {
            score += 15;
            reasons.push('Automotive industry fit');
          }
          if (industryLower.includes('fmcg') && (siteTagsLower.includes('entertainment') || siteTagsLower.includes('lifestyle'))) {
            score += 15;
            reasons.push('FMCG industry fit');
          }
          if (industryLower.includes('beauty') && siteTagsLower.includes('women')) {
            score += 20;
            reasons.push('Beauty industry fit');
          }
          if (industryLower.includes('tech') && siteTagsLower.includes('news')) {
            score += 10;
            reasons.push('Tech industry fit');
          }
        }
        
        // Score based on format compatibility - CRITICAL: Match site's actual formats with selected formats
        if (selectedFormats.length > 0) {
          // Get the format types from selected format IDs
          const selectedFormatObjs = selectedFormats.map(formatId => {
            return Object.values(availableFormats)
              .flat()
              .find(f => f.id === formatId);
          }).filter(Boolean);
          
          const hasVideoFormat = selectedFormatObjs.some(f => 
            f.type === 'video' || 
            f.name.toLowerCase().includes('video')
          );
          
          const hasDisplayFormat = selectedFormatObjs.some(f => 
            f.type === 'standard iab banner' || 
            f.type === 'high impact' ||
            f.name.toLowerCase().includes('banner') ||
            f.name.toLowerCase().includes('leaderboard') ||
            f.name.toLowerCase().includes('mrec')
          );
          
          const hasInteractiveFormat = selectedFormatObjs.some(f => 
            f.type === 'interactive banner' ||
            f.name.toLowerCase().includes('interactive') ||
            f.name.toLowerCase().includes('data capture')
          );
          
          // Check if THIS SPECIFIC SITE supports the selected format types
          const siteFormatsLower = site.formats?.map(f => f.toLowerCase()) || [];
          const siteSupportsVideo = siteFormatsLower.some(f => 
            f.includes('roll') || // Preroll, Midroll, Pre/midroll
            f.includes('video')
          );
          const siteSupportsDisplay = siteFormatsLower.some(f => 
            f.includes('banner') ||
            f.includes('leaderboard') ||
            f.includes('mrec') ||
            f.includes('masthead') ||
            f.includes('catfish')
          );
          const siteSupportsInteractive = siteFormatsLower.some(f => 
            f.includes('interstitial') ||
            f.includes('interactive') ||
            f.includes('in article') ||
            f.includes('in image')
          );
          
          // High score if site can serve the selected formats
          // Give points for each format type the site DOES support
          // Only penalize if site supports NONE of the selected format types
          let formatMatchCount = 0;
          
          if (hasVideoFormat) {
            if (siteSupportsVideo) {
              score += 50; // High priority for video match
              reasons.push('✓ Supports video format');
              formatMatchCount++;
            }
          }
          
          if (hasDisplayFormat) {
            if (siteSupportsDisplay) {
              score += 30;
              reasons.push('✓ Supports display format');
              formatMatchCount++;
            }
          }
          
          if (hasInteractiveFormat) {
            if (siteSupportsInteractive) {
              score += 35;
              reasons.push('✓ Supports interactive format');
              formatMatchCount++;
            }
          }
          
          // Only penalize if site supports NONE of the selected format types
          const totalFormatTypes = (hasVideoFormat ? 1 : 0) + (hasDisplayFormat ? 1 : 0) + (hasInteractiveFormat ? 1 : 0);
          if (totalFormatTypes > 0 && formatMatchCount === 0) {
            score -= 100; // EXCLUDE sites that can't serve ANY of the selected formats
            reasons.push('✗ Does not support selected formats');
          }
        }
        
        // Score based on language compatibility - CRITICAL for Web inventory filtering
        if (campaignPlan.targetLanguages && campaignPlan.targetLanguages.length > 0) {
          const siteLanguages = (site.languages || []).map(l => l.toLowerCase());
          const hasLanguageMatch = campaignPlan.targetLanguages.some(targetLang => {
            const targetLower = targetLang.toLowerCase();
            return siteLanguages.some(siteLang => {
              // Match exact language or multi-language sites
              return siteLang.includes(targetLower) || siteLang.includes('multi');
            });
          });
          
          if (hasLanguageMatch) {
            score += 40; // High priority for language match
            reasons.push('✓ Language match');
          } else if (channel === 'Web') {
            // EXCLUDE Web sites that don't match selected languages
            // OTT and Social are not filtered by language (universal platforms)
            score -= 200;
            reasons.push('✗ Language mismatch');
          }
        }
        
        // Score based on objective
        if (objective) {
          const objLower = objective.toLowerCase();
          const siteTagsLower = (site.tags || []).join(' ').toLowerCase();
          
          if (objLower.includes('awareness') && (channel === 'OTT' || siteTagsLower.includes('news'))) {
            score += 10;
            reasons.push('Awareness objective fit');
          }
          if ((objLower.includes('conversion') || objLower.includes('lead')) && channel === 'Social') {
            score += 15;
            reasons.push('Conversion objective fit');
          }
        }
        
        // Base score - always show premium properties
        if ((site.tags || []).includes('News') || (site.tags || []).includes('Premium')) {
          score += 10;
        }
        
        return {
          ...site,
          relevanceScore: score,
          relevanceReasons: reasons
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance
    });
    
    // Debug logging for video format filtering
    if (selectedFormats.length > 0) {
      Object.entries(scoredSites).forEach(([channel, sites]) => {
        const topSites = sites.slice(0, 3);
        console.log(`📊 ${channel} Channel - Top 3 Sites:`, 
          topSites.map(s => ({name: s.name, score: s.relevanceScore, reasons: s.relevanceReasons, formats: s.formats}))
        );
      });
    }
    
    // Only show channels with at least one relevant site (score > 0) or if no selections made yet
    const hasSelections = selectedPersonas.length > 0 || industry || selectedFormats.length > 0;
    
    if (!hasSelections) {
      // No selections yet - show all sites (use real data if available, fallback to static)
      return Object.keys(availableSites).length > 0 ? availableSites : SITES_DATABASE;
    }
    
    // Filter to only show relevant channels and sites
    const filtered = {};
    
    // Smart channel filtering based on selected formats
    if (selectedFormats.length > 0) {
      const selectedFormatObjs = selectedFormats.map(formatId => {
        return Object.values(availableFormats)
          .flat()
          .find(f => f.id === formatId);
      }).filter(Boolean);
      
      // Video formats: Specifically for streaming video (OTT-compatible)
      const hasVideoFormat = selectedFormatObjs.some(f => {
        const nameLower = f.name.toLowerCase();
        const typeLower = (f.type || '').toLowerCase();
        
        // EXCLUDE social video ads - they should NOT trigger OTT
        if (nameLower.includes('social')) {
          return false;
        }
        
        // Only true video streaming formats for OTT/Web
        return (
          typeLower === 'video' ||
          nameLower.includes('instream') ||
          nameLower.includes('pre-roll') ||
          nameLower.includes('mid-roll') ||
          nameLower.includes('preroll') ||
          nameLower.includes('midroll')
        );
      });
      
      // Display formats: Banners, high impact, etc. (NOT social ads)
      const hasDisplayFormat = selectedFormatObjs.some(f => {
        const nameLower = f.name.toLowerCase();
        const typeLower = (f.type || '').toLowerCase();
        
        // Exclude social formats from display detection
        if (nameLower.includes('social')) {
          return false;
        }
        
        return (
          typeLower === 'standard iab banner' || 
          typeLower === 'high impact' ||
          typeLower === 'interactive banner' ||
          nameLower.includes('banner') ||
          nameLower.includes('leaderboard') ||
          nameLower.includes('mrec') ||
          nameLower.includes('masthead') ||
          nameLower.includes('display') ||
          nameLower.includes('skyscraper') ||
          nameLower.includes('half page')
        );
      });
      
      // Social-specific formats: Stories, Reels, Feed posts, Social Ads (image + video)
      const hasSocialFormat = selectedFormatObjs.some(f => {
        const nameLower = f.name.toLowerCase();
        const typeLower = (f.type || '').toLowerCase();
        
        return (
          // Explicit social formats
          nameLower.includes('social') ||
          // Social platform formats
          nameLower.includes('stories') ||
          nameLower.includes('story') ||
          nameLower.includes('reel') ||
          nameLower.includes('tiktok') ||
          nameLower.includes('carousel') ||
          nameLower.includes('feed') ||
          nameLower.includes('instagram') ||
          nameLower.includes('facebook') ||
          nameLower.includes('snapchat') ||
          // Type-based detection
          typeLower === 'static image' // Image Social Ad type
        );
      });
      
      console.log('🎯 Smart Channel Filtering:', {
        hasVideoFormat,
        hasDisplayFormat,
        hasSocialFormat,
        selectedFormats: selectedFormatObjs.map(f => ({
          name: f.name,
          type: f.type,
          id: f.id
        }))
      });
      
      Object.entries(scoredSites).forEach(([channel, sites]) => {
        let shouldShowChannel = false;
        
        // OTT: Only show if streaming video formats are selected (YouTube, Astro GO Pre/MidRoll)
        if (channel === 'OTT') {
          shouldShowChannel = hasVideoFormat;
        }
        // Web: Show if streaming video OR display formats are selected (Awani, Gempak, Stadium Astro)
        else if (channel === 'Web') {
          shouldShowChannel = hasVideoFormat || hasDisplayFormat;
        }
        // Social: ONLY show for social-specific formats (Image/Video Social Ads, Stories, Reels)
        // Social should NOT show for In-stream Video (per reference spreadsheet)
        else if (channel === 'Social') {
          shouldShowChannel = hasSocialFormat;
        }
        // Other channels: use format-based filtering
        else {
          const threshold = 0;
          const relevantSites = sites.filter(s => s.relevanceScore > threshold);
          shouldShowChannel = relevantSites.length > 0;
        }
        
        if (shouldShowChannel) {
          // Further filter sites within the channel based on format compatibility
          const threshold = 0;
          const relevantSites = sites.filter(s => s.relevanceScore > threshold);
          
          if (relevantSites.length > 0) {
            filtered[channel] = relevantSites;
          }
        }
      });
    } else {
      // No formats selected - show all channels
      Object.entries(scoredSites).forEach(([channel, sites]) => {
        filtered[channel] = sites;
      });
    }
    
    // Always show at least one channel if filtering is too aggressive
    if (Object.keys(filtered).length === 0 && hasSelections) {
      // Fallback: show the highest scored channel
      const highestScored = Object.entries(scoredSites)
        .sort((a, b) => {
          const aMax = Math.max(...a[1].map(s => s.relevanceScore));
          const bMax = Math.max(...b[1].map(s => s.relevanceScore));
          return bMax - aMax;
        })[0];
      
      if (highestScored) {
        filtered[highestScored[0]] = highestScored[1];
      }
    }
    
    // Add hardcoded Social platforms if Social formats are selected
    const hasSocialFormat = selectedFormats.some(formatId => {
      const format = Object.values(availableFormats)
        .flat()
        .find(f => f.id === formatId);
      return format && (format.name.toLowerCase().includes('social') || format.type === 'static image');
    });
    
    if (hasSocialFormat) {
      filtered['Social'] = [
        {
          id: 'social_facebook',
          name: 'Facebook',
          category: 'Social Media',
          description: 'World\'s largest social network with 2.9B+ monthly active users',
          traffic: '2.9B',
          tags: ['Social', 'All Demographics', 'Global Reach', 'Image Ads', 'Video Ads'],
          formats: ['Static Image', 'Vertical Video', 'Carousel', 'Stories'],
          icon: 'social',
          relevanceScore: 100,
          relevanceReasons: ['Supports social formats', 'Global reach', 'All demographics']
        },
        {
          id: 'social_instagram',
          name: 'Instagram',
          category: 'Social Media',
          description: 'Visual-first platform popular with younger audiences, 2B+ users',
          traffic: '2.0B',
          tags: ['Social', 'Youth', 'Millennials', 'Visual Content', 'Image Ads', 'Video Ads'],
          formats: ['Static Image', 'Vertical Video', 'Stories', 'Reels'],
          icon: 'social',
          relevanceScore: 95,
          relevanceReasons: ['Supports social formats', 'Youth audience', 'Visual focus']
        },
        {
          id: 'social_tiktok',
          name: 'TikTok',
          category: 'Social Media',
          description: 'Short-form video platform, dominant with Gen Z, 1B+ users',
          traffic: '1.0B',
          tags: ['Social', 'Gen Z', 'Youth', 'Video First', 'Viral Content'],
          formats: ['Vertical Video', 'In-Feed Ads', 'Top View'],
          icon: 'social',
          relevanceScore: 90,
          relevanceReasons: ['Supports social formats', 'Gen Z audience', 'Video focus']
        }
      ];
    }
    
    return filtered;
  };

  const updatePlan = (updates) => {
    // Debug: Log optimisedGroups changes
    if ('optimisedGroups' in updates) {
      console.log('🔧 updatePlan changing optimisedGroups:', JSON.stringify({
        from: campaignPlan.optimisedGroups,
        to: updates.optimisedGroups,
        stackTrace: new Error().stack.split('\n').slice(2, 5).join('\n')
      }, null, 2));
    }
    
    // Validate date constraints
    if ('endDate' in updates || 'startDate' in updates) {
      const newStartDate = updates.startDate || campaignPlan.startDate;
      const newEndDate = updates.endDate || campaignPlan.endDate;
      
      // Check if end date is earlier than start date
      if (newStartDate && newEndDate && newEndDate < newStartDate) {
        setErrors(prev => ({
          ...prev,
          endDate: 'End date cannot be earlier than start date'
        }));
        return; // Don't update if validation fails
      } else {
        // Clear error if validation passes
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.endDate;
          return newErrors;
        });
      }
    }
    
    setCampaignPlan(prev => ({ ...prev, ...updates }));
  };

  const togglePersona = (personaName) => {
    const current = campaignPlan.selectedPersonas;
    
    // Clear downstream data (Formats, Sites, Budget) when personas change
    console.log('🔄 Persona changed, clearing Formats, Sites and Budget channels');
    
    if (current.includes(personaName)) {
      updatePlan({ 
        selectedPersonas: current.filter(p => p !== personaName),
        selectedFormats: [],
        selectedSites: [],
        optimisedGroups: []
      });
    } else {
      updatePlan({ 
        selectedPersonas: [...current, personaName],
        selectedFormats: [],
        selectedSites: [],
        optimisedGroups: []
      });
    }
    setBudgetChannels([]);
  };

  const toggleFormat = (formatId) => {
    const current = campaignPlan.selectedFormats;
    
    // Clear downstream data (Sites and Budget) when formats change
    console.log('🔄 FORMAT CHANGED v3.43.0 - Clearing Sites and Budget channels');
    
    if (current.includes(formatId)) {
      updatePlan({ 
        selectedFormats: current.filter(f => f !== formatId),
        selectedSites: [],
        optimisedGroups: []
      });
    } else {
      updatePlan({ 
        selectedFormats: [...current, formatId],
        selectedSites: [],
        optimisedGroups: []
      });
    }
    setBudgetChannels([]);
    
    // DON'T show modal here - it's only for navigation back from later steps
    // The modal is properly handled in handleStepClick() when user navigates backward
    // Showing it here causes it to appear on every format toggle in Step 3
  };

  const toggleSite = (siteId) => {
    const current = campaignPlan.selectedSites;
    if (current.includes(siteId)) {
      updatePlan({ selectedSites: current.filter(s => s !== siteId) });
    } else {
      updatePlan({ selectedSites: [...current, siteId] });
    }
  };

  const toggleOptimisedGroup = (channel) => {
    const current = campaignPlan.optimisedGroups;
    if (current.includes(channel)) {
      updatePlan({ optimisedGroups: current.filter(c => c !== channel) });
    } else {
      updatePlan({ optimisedGroups: [...current, channel] });
    }
  };

  const selectAllSitesInChannel = (channel, sites) => {
    const siteIds = sites.map(site => site.id);
    const currentSelected = campaignPlan.selectedSites;
    
    // Check if all sites in this channel are already selected
    const allSelected = siteIds.every(id => currentSelected.includes(id));
    
    if (allSelected) {
      // Deselect all sites in this channel
      updatePlan({ 
        selectedSites: currentSelected.filter(id => !siteIds.includes(id)),
        optimisedGroups: campaignPlan.optimisedGroups.filter(c => c !== channel)
      });
    } else {
      // Select all sites in this channel
      const newSelected = [...new Set([...currentSelected, ...siteIds])];
      updatePlan({ selectedSites: newSelected });
    }
  };

  const toggleChannelExpanded = (channel) => {
    setExpandedChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const toggleCategoryFilter = (category) => {
    setCategoryFilters(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Budget Channel Management
  const updateChannelBudget = (channelId, newBudget) => {
    setBudgetChannels(prev => prev.map(channel => {
      if (channel.id === channelId) {
        const budget = Math.max(0, parseFloat(newBudget) || 0);
        const impressions = Math.round((budget / channel.cpm) * 1000);
        return { ...channel, budget, impressions };
      }
      return channel;
    }));
  };

  const updateChannelCPM = (channelId, newCPM) => {
    setBudgetChannels(prev => prev.map(channel => {
      if (channel.id === channelId) {
        const cpm = Math.max(1, parseFloat(newCPM) || 1);
        const impressions = Math.round((channel.budget / cpm) * 1000);
        return { ...channel, cpm, impressions };
      }
      return channel;
    }));
  };

  const calculateBudgetRemaining = () => {
    const totalBudget = parseFloat(campaignPlan.totalBudget) || 0;
    const allocated = budgetChannels.reduce((sum, ch) => sum + ch.budget, 0);
    return totalBudget - allocated;
  };

  const calculateBudgetUsedPercent = () => {
    const totalBudget = parseFloat(campaignPlan.totalBudget) || 0;
    if (totalBudget === 0) return 0;
    const allocated = budgetChannels.reduce((sum, ch) => sum + ch.budget, 0);
    return Math.min(100, (allocated / totalBudget) * 100);
  };

  const addChannelFromRecommendation = (recommendation) => {
    console.log('🔍 DEBUG - addChannelFromRecommendation called with:', {
      id: recommendation.id,
      name: recommendation.name,
      recommendationCpm: recommendation.cpm,
      recommendationStatsCpm: recommendation.stats?.cpm,
      recommendationCost: recommendation.cost
    });
    
    let budget = recommendation.cost || 0;
    const originalBudget = budget; // Store original budget BEFORE any loading
    const baseCpm = recommendation.cpm || recommendation.stats?.cpm || 50; // Base CPM from recommendation
    let cpm = baseCpm; // Working CPM (may be modified by loading)
    let hasLoading = false; // Track if 100% loading was applied
    
    console.log(`🔍 DEBUG - Extracted values: baseCpm=${baseCpm}, budget=${budget}`);
    
    // Determine which channel type this recommendation belongs to
    const recommendationChannel = 
      (recommendation.id.includes('ott') || recommendation.name.toLowerCase().includes('ott')) ? 'OTT' :
      (recommendation.id.includes('video') || recommendation.name.toLowerCase().includes('video')) ? 'OTT' : // Video channels treated as OTT for loading logic
      (recommendation.id.includes('web') || recommendation.name.toLowerCase().includes('web') || recommendation.name.toLowerCase().includes('display')) ? 'Web' :
      (recommendation.id.includes('interactive') || recommendation.name.toLowerCase().includes('interactive')) ? 'Web' : // Interactive treated as Web
      (recommendation.id.includes('social')) ? 'Social' : 
      'Web'; // Default to Web for unknown types (includes High Impact, etc.)
    
    // Apply 100% loading if "Optimize" is NOT checked for this channel's category
    // EXCEPTION: Social channels never get loading applied (always use base rate)
    if (recommendationChannel && recommendationChannel !== 'Social') {
      const isOptimized = campaignPlan.optimisedGroups.includes(recommendationChannel);
      
      if (!isOptimized) {
        budget = budget * 2; // 100% loading = 2x budget
        cpm = cpm * 2; // 100% loading = 2x CPM (CRITICAL FIX)
        hasLoading = true;
        console.log(`💰 ${recommendationChannel} channel NOT optimized: Applied 100% loading to ${recommendation.name} (Budget: RM ${originalBudget.toLocaleString()} → RM ${budget.toLocaleString()}, CPM: ${baseCpm} → ${cpm})`);
      } else {
        console.log(`✅ ${recommendationChannel} channel IS optimized: No loading applied to ${recommendation.name} (Budget: RM ${budget.toLocaleString()}, CPM: ${cpm})`);
      }
    } else if (recommendationChannel === 'Social') {
      console.log(`✅ Social channel: No loading applied (always base rate) to ${recommendation.name} (Budget: RM ${budget.toLocaleString()}, CPM: ${cpm})`);
    }
    
    const impressions = Math.round((budget / cpm) * 1000);
    
    const newChannel = {
      id: recommendation.id,
      name: recommendation.name,
      budget,
      cpm,
      baseCpm: baseCpm, // Store original base CPM (before any loading)
      baseBudget: originalBudget, // Store original base budget (before any loading)
      impressions,
      weight: recommendation.weight,
      hasLoading, // Add flag to indicate loading was applied
      color: (recommendation.id.includes('ott') || recommendation.id.includes('video')) ? 'bg-green-500' : 
             recommendation.id.includes('social') ? 'bg-blue-500' : 'bg-purple-500'
    };
    
    console.log('✅ DEBUG - newChannel created:', {
      id: newChannel.id,
      name: newChannel.name,
      baseCpm: newChannel.baseCpm,
      cpm: newChannel.cpm,
      budget: newChannel.budget,
      hasLoading: newChannel.hasLoading
    });

    setBudgetChannels(prev => {
      const exists = prev.find(ch => ch.id === recommendation.id);
      if (exists) {
        return prev.map(ch => ch.id === recommendation.id ? newChannel : ch);
      }
      return [...prev, newChannel];
    });
  };

  // Get recommended personas based on industry
  const getRecommendedPersonas = () => {
    if (!campaignPlan.industry) return [];
    
    const industryKey = campaignPlan.industry.toLowerCase().replace(/\s+/g, '_');
    const playbook = verticalPlaybook.persona_mapping[industryKey];
    
    if (playbook && playbook.primary_personas) {
      return playbook.primary_personas;
    }
    
    return [];
  };

  // Pre-select formats based on objective (ONLY for new campaigns, not loaded ones)
  useEffect(() => {
    // Skip auto-selection if we're loading an existing campaign
    if (id) return;
    
    if (currentStep === 4 && campaignPlan.selectedFormats.length === 0) {
      const objective = campaignPlan.objective;
      let recommended = [];
      
      if (objective === 'Awareness' || objective === 'Brand building') {
        // Masthead (fmt_6), In-stream Video (fmt_9), Leaderboard (fmt_1), MREC (fmt_2)
        recommended = ['fmt_6', 'fmt_9', 'fmt_1', 'fmt_2'];
      } else if (objective === 'Traffic' || objective === 'Engagement') {
        // Leaderboard (fmt_1), MREC (fmt_2), Carousel (fmt_29), In-Read Video (fmt_10)
        recommended = ['fmt_1', 'fmt_2', 'fmt_29', 'fmt_10'];
      } else if (objective === 'Lead generation' || objective === 'Sales / Conversions') {
        // Data Capture (fmt_20), Product Collector (fmt_25), Leaderboard (fmt_1), MREC (fmt_2)
        recommended = ['fmt_20', 'fmt_25', 'fmt_1', 'fmt_2'];
      }
      
      updatePlan({ selectedFormats: recommended });
    }
  }, [currentStep, campaignPlan.objective, id]);

  // Calculate estimated impressions based on budget allocation in Step 4
  useEffect(() => {
    const budget = parseFloat(campaignPlan.totalBudget) || 0;
    if (budget > 0) {
      // Priority 1: If user has allocated budget in Step 4, use that
      if (budgetChannels && budgetChannels.length > 0) {
        const totalImpressions = budgetChannels.reduce((sum, channel) => {
          return sum + (channel.impressions || 0);
        }, 0);
        console.log(`💰 Using Step 4 budget allocation: ${(totalImpressions / 1000000).toFixed(1)}M impressions from ${budgetChannels.length} channels`);
        updatePlan({ estimatedImpressions: totalImpressions });
      } 
      // Priority 2: Otherwise, calculate based on selected formats
      else {
        const calculateImpressionsFromFormats = async () => {
          try {
            const response = await axios.post('/api/calculate-impressions', {
              budget,
              selectedFormatIds: campaignPlan.selectedFormats || []
            });
            
            if (response.data.success) {
              console.log(`📊 Calculated from formats: ${(response.data.impressions / 1000000).toFixed(1)}M impressions`);
              updatePlan({ estimatedImpressions: response.data.impressions });
            }
          } catch (error) {
            console.error('[CALCULATE IMPRESSIONS ERROR]:', error.message);
            // Fallback to simple estimation if API call fails
            const avgCPM = 12;
            const impressions = Math.round((budget / avgCPM) * 1000);
            updatePlan({ estimatedImpressions: impressions });
          }
        };
        
        calculateImpressionsFromFormats();
      }
    }
  }, [campaignPlan.totalBudget, campaignPlan.selectedFormats, budgetChannels]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Calculate audience overlap when multiple personas are selected
  const calculatePersonaOverlap = () => {
    const selected = campaignPlan.selectedPersonas;
    
    console.log('=== Overlap Calculation Start ===');
    console.log('Selected personas:', selected);
    console.log('Available personas count:', availablePersonas.length);
    console.log('Available personas sample:', availablePersonas.slice(0, 3).map(p => ({ name: p.name, size: p.size })));
    
    if (selected.length === 0) {
      console.log('No personas selected, returning null');
      return null;
    }

    // Calculate demographic multiplier
    let demographicMultiplier = 1.0;
    
    console.log('Demographic filters:', campaignPlan.demographicFilters);
    
    if (campaignPlan.demographicFilters?.race?.length > 0) {
      const raceMultiplier = campaignPlan.demographicFilters.race.reduce((sum, race) => {
        const value = MALAYSIA_DEMOGRAPHICS.Race[race] || 0;
        console.log(`Race ${race}: ${value} (${value * 100}%)`);
        return sum + value;
      }, 0);
      console.log('Race multiplier:', raceMultiplier);
      demographicMultiplier *= raceMultiplier;
    }
    
    if (campaignPlan.demographicFilters?.generation?.length > 0) {
      const genMultiplier = campaignPlan.demographicFilters.generation.reduce((sum, gen) => {
        const value = MALAYSIA_DEMOGRAPHICS.Generation[gen] || 0;
        console.log(`Generation ${gen}: ${value} (${value * 100}%)`);
        return sum + value;
      }, 0);
      console.log('Generation multiplier:', genMultiplier);
      demographicMultiplier *= genMultiplier;
    }
    
    if (campaignPlan.demographicFilters?.income?.length > 0) {
      const incomeMultiplier = campaignPlan.demographicFilters.income.reduce((sum, income) => {
        const value = MALAYSIA_DEMOGRAPHICS.Income[income] || 0;
        console.log(`Income ${income}: ${value} (${value * 100}%)`);
        return sum + value;
      }, 0);
      console.log('Income multiplier:', incomeMultiplier);
      demographicMultiplier *= incomeMultiplier;
    }
    
    console.log('Final demographic multiplier:', demographicMultiplier);

    // Calculate geography multiplier
    let geographyMultiplier = 1.0;
    if (campaignPlan.selectedStates.length > 0 && campaignPlan.selectedStates.length < availableStates.length) {
      // Calculate what % of national audience the selected states represent
      // We'll use audienceData to calculate state-level percentages
      if (audienceData.length > 0 && availableStates.length > 0) {
        const samplePersona = audienceData[0];
        let selectedStatesTotal = 0;
        let nationalTotal = 0;
        
        availableStates.forEach(state => {
          const stateValue = parseFloat(String(samplePersona[state] || '0').replace(/,/g, ''));
          nationalTotal += stateValue;
          if (campaignPlan.selectedStates.includes(state)) {
            selectedStatesTotal += stateValue;
          }
        });
        
        if (nationalTotal > 0) {
          geographyMultiplier = selectedStatesTotal / nationalTotal;
        }
      }
    }

    // Get persona data from availablePersonas
    const personas = selected.map(name => {
      let found = availablePersonas.find(p => p.name === name);
      
      // If exact match not found, try fuzzy matching
      if (!found) {
        // Try partial match (case-insensitive)
        found = availablePersonas.find(p => 
          p.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(p.name.toLowerCase())
        );
        
        if (found) {
          console.log(`📝 Fuzzy match found: "${name}" → "${found.name}"`);
        } else {
          console.warn(`Persona not found: ${name} (tried fuzzy matching)`);
          // Return a default minimal persona to avoid breaking the calculation
          return {
            name,
            size: 0,
            originalSize: 0,
            category: 'Unknown'
          };
        }
      }

      // Apply demographic AND geography multipliers to size
      const adjustedSize = Math.round(found.size * demographicMultiplier * geographyMultiplier);
      
      // Debug logging
      console.log('Overlap calculation:', {
        persona: name,
        originalSize: found.size,
        demographicMultiplier,
        geographyMultiplier,
        adjustedSize,
        selectedStates: campaignPlan.selectedStates.length,
        audienceDataLoaded: audienceData.length > 0
      });

      return {
        name,
        size: adjustedSize,
        originalSize: found.size,
        category: found.category || 'Unknown'
      };
    }).filter(p => p.size > 0); // Filter out personas with 0 size

    if (personas.length === 0) {
      console.warn('No personas found for overlap calculation');
      return null;
    }

    // Calculate total raw audience
    const totalRaw = personas.reduce((sum, p) => sum + p.size, 0);

    // Mass Targeting: Raw audience and unique reach calculation
    const MASS_TARGETING_RAW = 86375180; // 86.38M raw audience (all segments)
    const MASS_TARGETING_UNIQUE = 16150000; // 16.15M unique reach
    
    if (campaignPlan.massTargeting) {
      // Apply demographic and geography filters to both raw and unique
      const filteredRaw = Math.round(MASS_TARGETING_RAW * demographicMultiplier * geographyMultiplier);
      const filteredUnique = Math.round(MASS_TARGETING_UNIQUE * demographicMultiplier * geographyMultiplier);
      
      // Calculate overlap percentage
      const overlapAbsolute = filteredRaw - filteredUnique;
      const overlapPercent = filteredRaw > 0 ? Math.round((overlapAbsolute / filteredRaw) * 100) : 0;
      
      return {
        personas,
        totalRaw: filteredRaw,
        overlapPercent: overlapPercent,
        estimatedOverlap: overlapAbsolute,
        uniqueReach: filteredUnique,
        demographicMultiplier,
        geographyMultiplier,
        isMassTargeting: true
      };
    }

    // Single persona case - no overlap
    if (personas.length === 1) {
      return {
        personas,
        totalRaw,
        overlapPercent: 0,
        estimatedOverlap: 0,
        uniqueReach: totalRaw,
        demographicMultiplier
      };
    }

    // Multiple personas - calculate overlap based on categories
    let overlapFactor = 0;
    let pairCount = 0;

    for (let i = 0; i < personas.length; i++) {
      for (let j = i + 1; j < personas.length; j++) {
        // Same category = 60% overlap, different = 25%
        const sameCategory = personas[i].category === personas[j].category;
        overlapFactor += sameCategory ? 0.60 : 0.25;
        pairCount++;
      }
    }

    const avgOverlapFactor = pairCount > 0 ? overlapFactor / pairCount : 0;
    const estimatedOverlap = Math.round(totalRaw * avgOverlapFactor);
    const uniqueReach = totalRaw - estimatedOverlap;

    return {
      personas,
      totalRaw,
      overlapPercent: Math.round(avgOverlapFactor * 100),
      estimatedOverlap,
      uniqueReach,
      demographicMultiplier
    };
  };

  // Audience Group Management Functions
  const saveAudienceGroup = async () => {
    if (!groupName.trim()) {
      showConfirm({
        title: 'Missing Group Name',
        message: 'Please enter a group name',
        confirmText: 'OK',
        cancelText: null,
        type: 'warning'
      });
      return;
    }

    if (campaignPlan.selectedPersonas.length === 0) {
      showConfirm({
        title: 'No Personas Selected',
        message: 'Please select at least one persona',
        confirmText: 'OK',
        cancelText: null,
        type: 'warning'
      });
      return;
    }

    // Calculate unique reach for this group
    const overlapData = calculatePersonaOverlap();
    const uniqueReach = overlapData ? overlapData.uniqueReach : 0;
    const totalAudience = overlapData ? overlapData.totalReach : 0;

    const newGroup = {
      id: Date.now().toString(),
      name: groupName.trim(),
      personas: [...campaignPlan.selectedPersonas],
      demographicFilters: { ...campaignPlan.demographicFilters },
      selectedStates: [...campaignPlan.selectedStates],
      uniqueReach: uniqueReach,
      createdAt: new Date().toISOString()
    };

    // Save to backend API (for Audience Segments page)
    try {
      const audienceGroupData = {
        name: groupName.trim(),
        personas: [...campaignPlan.selectedPersonas],
        demographics: { ...campaignPlan.demographicFilters },
        totalAudience: totalAudience,
        uniqueReach: uniqueReach,
        industry: campaignPlan.industry || '',
        objective: campaignPlan.objective || '',
        geography: campaignPlan.selectedStates.length === availableStates.length 
          ? 'Nationwide' 
          : campaignPlan.selectedStates.join(', '),
        createdBy: 'Build Plan Wizard'
      };

      const response = await axios.post('/api/audience-groups', audienceGroupData);
      console.log('✅ Saved audience group to backend:', response.data);
      
      // Show success message
      showConfirm({
        title: 'Audience Group Saved',
        message: `"${groupName.trim()}" has been saved and is now available in the Audience Segments page.`,
        confirmText: 'OK',
        cancelText: null,
        type: 'info'
      });
    } catch (error) {
      console.error('❌ Error saving audience group to backend:', error);
      
      // Fallback: save to localStorage
      const existingGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      existingGroups.push({
        ...newGroup,
        industry: campaignPlan.industry,
        objective: campaignPlan.objective,
        geography: campaignPlan.selectedStates.join(', ')
      });
      localStorage.setItem('savedAudienceGroups', JSON.stringify(existingGroups));
      console.log('✅ Saved audience group to localStorage as fallback');
      
      // Show fallback success message
      showConfirm({
        title: 'Audience Group Saved Locally',
        message: `"${groupName.trim()}" has been saved locally. It will sync to the server when available.`,
        confirmText: 'OK',
        cancelText: null,
        type: 'info'
      });
    }

    // Also save to local campaign groups
    if (editingGroupIndex !== null) {
      // Edit existing group
      const updatedGroups = [...campaignPlan.audienceGroups];
      updatedGroups[editingGroupIndex] = { ...updatedGroups[editingGroupIndex], ...newGroup };
      updatePlan({ audienceGroups: updatedGroups });
    } else {
      // Add new group
      updatePlan({ audienceGroups: [...campaignPlan.audienceGroups, newGroup] });
    }

    // Reset modal
    setGroupName('');
    setEditingGroupIndex(null);
    setShowGroupModal(false);
  };

  const loadAudienceGroup = (group) => {
    updatePlan({
      selectedPersonas: [...group.personas],
      demographicFilters: { ...group.demographicFilters },
      selectedStates: group.selectedStates ? [...group.selectedStates] : []
    });
  };

  const deleteAudienceGroup = (index) => {
    showConfirm({
      title: 'Delete Audience Group',
      message: 'Are you sure you want to delete this audience group?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        const updatedGroups = campaignPlan.audienceGroups.filter((_, i) => i !== index);
        updatePlan({ audienceGroups: updatedGroups });
      }
    });
  };

  const openEditGroupModal = (index) => {
    const group = campaignPlan.audienceGroups[index];
    setGroupName(group.name);
    setEditingGroupIndex(index);
    setShowGroupModal(true);
  };

  // Fetch AI recommendations when step changes
  const fetchAIRecommendations = useCallback(async () => {
    if (currentStep < 2 || currentStep > 5) {
      setAiRecommendations([]);
      return;
    }
    
    setIsLoadingRecommendations(true);
    
    try {
      const stepMap = { 2: 'audience', 3: 'formats', 4: 'budget', 5: 'overview' };
      const step = stepMap[currentStep];
      
      const brief = {
        advertiserName: campaignPlan.campaignName,
        product_brand: campaignPlan.brandProduct,
        campaign_objective: campaignPlan.objective,
        industry: campaignPlan.industry,
        budget_rm: parseInt(campaignPlan.totalBudget) || 100000
      };
      
      console.log('🤖 Fetching AI recommendations:', {
        step,
        objective: campaignPlan.objective,
        industry: campaignPlan.industry,
        currentStep,
        hasFormats: campaignPlan.selectedFormats.length > 0
      });

      const response = await axios.post('/api/ai-recommendations/generate', {
        brief,
        step,
        currentSelections: {
          audiences: campaignPlan.selectedPersonas,
          formats: campaignPlan.selectedFormats,
          sites: campaignPlan.selectedSites,
          budgetChannels: budgetChannels  // Include Step 4 budget allocation
        }
      });

      if (response.data.success) {
        console.log('✅ AI recommendations received:', response.data.recommendations.length);
        setAiRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('❌ Error fetching AI recommendations:', error);
      setAiRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [
    currentStep,
    campaignPlan.campaignName,
    campaignPlan.objective,
    campaignPlan.industry,
    campaignPlan.totalBudget,
    campaignPlan.selectedPersonas,
    campaignPlan.selectedFormats,
    campaignPlan.selectedSites
  ]);

  // Debug: Log campaignPlan changes
  useEffect(() => {
    console.log('📊 campaignPlan state updated:', {
      name: campaignPlan.campaignName,
      objective: campaignPlan.objective,
      industry: campaignPlan.industry,
      brandProduct: campaignPlan.brandProduct
    });
  }, [campaignPlan.campaignName, campaignPlan.objective, campaignPlan.industry, campaignPlan.brandProduct]);
  
  // Fetch AI recommendations when step changes, formats selected, or campaign data loaded
  // This handles both new campaigns and loaded drafts
  useEffect(() => {
    // Small delay to ensure state has propagated after setCampaignPlan
    const timeoutId = setTimeout(() => {
      if (currentStep >= 2 && currentStep <= 5) {
        if (campaignPlan.objective && campaignPlan.industry) {
          console.log('🤖 Fetching AI recommendations with campaign data:', {
            name: campaignPlan.campaignName || '(new)',
            objective: campaignPlan.objective,
            industry: campaignPlan.industry,
            step: currentStep,
            formats: campaignPlan.selectedFormats.length
          });
          fetchAIRecommendations();
        } else {
          console.log('⏸️ Skipping AI fetch - campaignPlan state:', {
            name: campaignPlan.campaignName,
            objective: campaignPlan.objective,
            industry: campaignPlan.industry,
            hasObjective: !!campaignPlan.objective,
            hasIndustry: !!campaignPlan.industry
          });
        }
      }
    }, 100); // 100ms delay to let state propagate
    
    return () => clearTimeout(timeoutId);
  }, [currentStep, campaignPlan.campaignName, campaignPlan.objective, campaignPlan.industry, campaignPlan.selectedFormats.length, fetchAIRecommendations]);

  // Handle adding a recommendation
  const handleAddRecommendation = (rec) => {
    // Toggle behavior: Add if not present, Remove if already added
    if (rec.type === 'audience') {
      if (campaignPlan.selectedPersonas.includes(rec.name)) {
        // Remove if already added
        updatePlan({ selectedPersonas: campaignPlan.selectedPersonas.filter(p => p !== rec.name) });
      } else {
        // Add if not present
        updatePlan({ selectedPersonas: [...campaignPlan.selectedPersonas, rec.name] });
      }
    } else if (rec.type === 'format') {
      if (campaignPlan.selectedFormats.includes(rec.id)) {
        // Remove if already added
        updatePlan({ selectedFormats: campaignPlan.selectedFormats.filter(f => f !== rec.id) });
      } else {
        // Add if not present
        updatePlan({ selectedFormats: [...campaignPlan.selectedFormats, rec.id] });
      }
    } else if (rec.type === 'site') {
      if (campaignPlan.selectedSites.includes(rec.id)) {
        // Remove if already added
        updatePlan({ selectedSites: campaignPlan.selectedSites.filter(s => s !== rec.id) });
      } else {
        // Add if not present
        updatePlan({ selectedSites: [...campaignPlan.selectedSites, rec.id] });
      }
    } else if (rec.type === 'budget') {
      // Check if this budget channel already exists
      const existingChannel = budgetChannels.find(ch => ch.id === rec.id);
      if (existingChannel) {
        // Remove if already added
        setBudgetChannels(prev => prev.filter(ch => ch.id !== rec.id));
        console.log(`🗑️ Removed budget channel: ${rec.name}`);
      } else {
        // Add if not present
        addChannelFromRecommendation(rec);
        console.log(`➕ Added budget channel: ${rec.name}`);
      }
    }
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const response = await axios.post('/api/export/kult-template', {
        campaignPlan,
        budgetChannels,
        availableSites,
        campaignName: campaignPlan.campaignName || 'Campaign Plan'
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KULT_${campaignPlan.campaignName || 'Campaign_Plan'}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showConfirm({
        title: 'Success',
        message: 'KULT Media Plan downloaded successfully!',
        confirmText: 'OK',
        cancelText: null,
        type: 'info'
      });
    } catch (error) {
      console.error('Export Excel error:', error);
      showConfirm({
        title: 'Export Failed',
        message: 'Failed to export Excel file. Please try again.',
        confirmText: 'OK',
        cancelText: null,
        type: 'danger'
      });
    }
  };
  
  const handleExportPDF = async () => {
    // Show loading message
    showConfirm({
      title: 'Generating PDF...',
      message: 'Please wait while we generate your media plan PDF (10-15 seconds). Do not close this window.',
      confirmText: null, // No buttons while loading
      cancelText: null,
      type: 'info'
    });
    
    try {
      const response = await axios.post('/api/export/kult-template-pdf', {
        campaignPlan,
        budgetChannels,
        availableSites,
        campaignName: campaignPlan.campaignName || 'Campaign Plan'
      }, {
        responseType: 'blob',
        timeout: 60000 // 60 seconds timeout for PDF generation
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KULT_${campaignPlan.campaignName || 'Campaign_Plan'}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showConfirm({
        title: 'Success',
        message: 'KULT Media Plan PDF downloaded successfully!',
        confirmText: 'OK',
        cancelText: null,
        type: 'info'
      });
    } catch (error) {
      console.error('Export PDF error:', error);
      showConfirm({
        title: 'Export Failed',
        message: 'Failed to export PDF file. Please try again.',
        confirmText: 'OK',
        cancelText: null,
        type: 'danger'
      });
    }
  };
  
  const handleSendToAI = async () => {
    try {
      // Ask user what they want to do
      const downloadWord = await showConfirm({
        title: 'Campaign Strategy Export',
        message: 'How would you like to get your campaign strategy?',
        confirmText: 'Download as Word',
        cancelText: 'Copy Text to Clipboard',
        type: 'info'
      });
      
      // Show loading dialog
      showConfirm({
        title: 'Generating Campaign Strategy...',
        message: 'Please wait while AI creates your professional strategy document (5-10 seconds).',
        confirmText: null,
        cancelText: null,
        type: 'info'
      });

      if (downloadWord) {
        // Download Word document
        const response = await axios.post('/api/export/ai-narrative', {
          campaignPlan: {
            ...campaignPlan,
            budgetChannels
          }
        }, {
          responseType: 'blob' // Expect binary data (Word document)
        });
        
        // Close loading dialog
        setShowConfirmModal(false);
        
        // Download the Word document
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const campaignName = campaignPlan.campaignName || 'Campaign';
        const sanitizedName = campaignName.replace(/[^a-z0-9]/gi, '_');
        link.setAttribute('download', `KULT_${sanitizedName}_Strategy_${Date.now()}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        // Show success message
        showConfirm({
          title: 'Success',
          message: 'Campaign strategy document downloaded successfully!',
          confirmText: 'OK',
          cancelText: null,
          type: 'info'
        });
      } else {
        // Copy text to clipboard
        const response = await axios.post('/api/export/ai-narrative-text', {
          campaignPlan: {
            ...campaignPlan,
            budgetChannels
          }
        });
        
        // Close loading dialog
        setShowConfirmModal(false);
        
        if (response.data.success) {
          const text = response.data.text;
          await navigator.clipboard.writeText(text);
          
          showConfirm({
            title: 'Copied',
            message: 'Campaign strategy text copied to clipboard successfully!',
            confirmText: 'OK',
            cancelText: null,
            type: 'info'
          });
        }
      }
    } catch (error) {
      console.error('AI Narrative error:', error);
      setShowConfirmModal(false);
      showConfirm({
        title: 'Error',
        message: 'Failed to generate campaign strategy document. Please try again.',
        confirmText: 'OK',
        cancelText: null,
        type: 'danger'
      });
    }
  };
  
  const handleSaveDraft = async () => {
    console.log('💾 handleSaveDraft called. Campaign ID:', campaignPlan.id);
    
    // If this is an update to existing campaign, show save dialog
    if (campaignPlan.id) {
      console.log('📝 Existing campaign detected, showing save dialog');
      setSaveAction('draft');
      setNewVersionName(`${campaignPlan.campaignName} (v${Date.now()})`);
      setShowSaveDialog(true);
      return;
    }
    
    console.log('🆕 New campaign, saving directly');
    // New campaign - save directly
    await performSave('draft', false);
  };
  
  const performSave = async (action, isNewVersion) => {
    try {
      const isUpdate = campaignPlan.id && !isNewVersion;
      
      const payload = {
        campaignPlan: {
          ...campaignPlan,
          ...(isNewVersion && { campaignName: newVersionName, id: undefined }), // Clear ID for new version
          budgetChannels,
          currentStep
        },
        status: action === 'draft' ? 'draft' : 'booked'
      };
      
      let response;
      if (isUpdate) {
        // Update existing campaign
        response = await axios.put(`/api/campaigns/${campaignPlan.id}`, payload);
        // Success modal will be shown below
      } else {
        // Create new campaign (or new version)
        response = await axios.post('/api/campaigns', payload);
        // Success modal will be shown below
      }
      
      if (response.data.success) {
        // Update local state with campaign ID
        if (!isUpdate) {
          updatePlan({ 
            id: response.data.campaign.id,
            ...(isNewVersion && { campaignName: newVersionName })
          });
        }
        
        if (action === 'draft') {
          setShowSuccessModal(true);
        } else {
          setShowBookingModal(true);
        }
        
        // Close save dialog
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      showConfirm({
        title: 'Save Failed',
        message: 'Failed to save. Please try again.',
        confirmText: 'OK',
        cancelText: null,
        type: 'danger'
      });
    }
  };

  // Handle navigation events from Layout (Save & New Campaign)
  useEffect(() => {
    const handleSaveDraftAndReset = async () => {
      console.log('💾 Save draft and reset triggered from navigation');
      
      // Save current draft if there's data
      if (campaignPlan.campaignName || campaignPlan.selectedPersonas.length > 0) {
        await handleSaveDraft();
      }
      
      // Reset to new campaign
      handleClearData();
      setCurrentStep(1);
    };

    const handleResetOnly = () => {
      console.log('🔄 Reset build plan triggered from navigation');
      handleClearData();
      setCurrentStep(1);
    };

    window.addEventListener('saveDraftAndReset', handleSaveDraftAndReset);
    window.addEventListener('resetBuildPlan', handleResetOnly);

    return () => {
      window.removeEventListener('saveDraftAndReset', handleSaveDraftAndReset);
      window.removeEventListener('resetBuildPlan', handleResetOnly);
    };
  }, [campaignPlan.campaignName, campaignPlan.selectedPersonas.length]);

  const handleBookNow = async () => {
    if (!campaignPlan.id) {
      showConfirm({
        title: 'Save Required',
        message: 'Please save as draft first before booking.',
        confirmText: 'OK',
        cancelText: null,
        type: 'warning'
      });
      return;
    }

    showConfirm({
      title: 'Book this campaign now?',
      message: 'This will submit your booking to the sales team for processing. They will be notified and will contact you to confirm the booking.\n\nYou can still edit it later if needed.',
      confirmText: 'OK',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => {
        // Show save dialog for booking too
        setSaveAction('book');
        setNewVersionName(`${campaignPlan.campaignName} (v${Date.now()})`);
        setShowSaveDialog(true);
      }
    });
  };

  const isPlanComplete = () => {
    return (
      campaignPlan.selectedPersonas.length > 0 &&
      campaignPlan.totalBudget &&
      campaignPlan.selectedFormats.length > 0 &&
      campaignPlan.selectedSites.length > 0
    );
  };

  const getSelectedItemIds = () => {
    if (currentStep === 2) return campaignPlan.selectedPersonas;
    if (currentStep === 3) return campaignPlan.selectedFormats;
    if (currentStep === 4) return [...budgetChannels.filter(ch => ch.budget > 0).map(ch => ch.id), ...campaignPlan.selectedSites];
    return [];
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-400 font-semibold mb-1 tracking-wider">
                [ BUILD YOUR PLAN ]
              </div>
              <h1 className="text-2xl font-bold text-white">Campaign Planner Wizard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Auto-save indicator */}
              {campaignPlan.id && (
                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saving' && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  )}
                  {autoSaveStatus === 'saved' && lastSaved && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {autoSaveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Save failed</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-sm text-gray-400">
                Step {currentStep} of 5
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Horizontal Stepper */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max">
            {steps.map((step, idx) => {
              const isActive = step.num === currentStep;
              const isCompleted = completedSteps.includes(step.num);
              const isClickable = canNavigateToStep(step.num);
              
              return (
                <React.Fragment key={step.num}>
                  <button
                    onClick={() => handleStepClick(step.num)}
                    disabled={!isClickable}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-cyan-900/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : isCompleted
                        ? 'bg-green-900/20 border border-green-700 hover:bg-green-900/30'
                        : isClickable
                        ? 'border border-gray-700 hover:border-gray-600'
                        : 'border border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isActive
                        ? 'bg-cyan-500 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step.icon}
                    </div>
                    <div className="text-left">
                      <div className={`text-xs ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                        Step {step.num}
                      </div>
                      <div className={`text-sm font-semibold ${
                        isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </div>
                    </div>
                  </button>
                  
                  {idx < steps.length - 1 && (
                    <div className="flex-shrink-0 w-12 h-0.5 bg-gray-800 mx-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6 p-4 sm:p-6 lg:p-8">
          {/* Left Panel - Step Content */}
          <div className="flex-1 max-w-4xl pb-56">
            {/* Step 1: Campaign Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      1. Tell us about your campaign
                    </h2>
                    {(campaignPlan.campaignName || campaignPlan.advertiserName || campaignPlan.objective || campaignPlan.industry || campaignPlan.brandProduct || campaignPlan.startDate || campaignPlan.endDate) && (
                      <button
                        onClick={() => {
                          setCampaignPlan(prev => ({
                            ...prev,
                            campaignName: '',
                            advertiserName: '',
                            objective: '',
                            industry: '',
                            brandProduct: '',
                            startDate: '',
                            endDate: ''
                          }));
                          console.log('🗑️ Step 1: All campaign details cleared');
                        }}
                        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                        title="Clear all campaign details"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    We'll start with the basics. You can refine details later, but we need at least an objective and an industry to use the right playbook.
                  </p>
                </div>

                <div className="space-y-6 bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
                  {/* Campaign Name */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Campaign name
                    </label>
                    <input
                      type="text"
                      value={campaignPlan.campaignName}
                      onChange={(e) => updatePlan({ campaignName: e.target.value })}
                      placeholder="E.g. New SUV launch Q3 2026"
                      className={`w-full px-4 py-3 bg-[#1a1a1a] border ${
                        errors.campaignName ? 'border-yellow-500' : 'border-gray-700'
                      } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use a name your sales team and client will recognise later.
                    </p>
                    {errors.campaignName && (
                      <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.campaignName}
                      </p>
                    )}
                  </div>

                  {/* Advertiser Name */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Advertiser name
                    </label>
                    <input
                      type="text"
                      value={campaignPlan.advertiserName}
                      onChange={(e) => updatePlan({ advertiserName: e.target.value })}
                      placeholder="E.g. McDonald's, Toyota, Maybank"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The company or brand name running this campaign.
                    </p>
                  </div>

                  {/* Objective */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Primary objective <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={campaignPlan.objective}
                      onChange={(e) => updatePlan({ objective: e.target.value })}
                      className={`w-full px-4 py-3 bg-[#1a1a1a] border ${
                        errors.objective ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white focus:outline-none focus:border-cyan-500`}
                    >
                      <option value="">Select objective...</option>
                      <option value="Awareness">Awareness</option>
                      <option value="Traffic">Traffic</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Lead generation">Lead generation</option>
                      <option value="Sales / Conversions">Sales / Conversions</option>
                      <option value="Brand building">Brand building</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Pick the main outcome. The planner will adjust formats and channels around this.
                    </p>
                    {errors.objective && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {errors.objective}
                      </p>
                    )}
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Industry <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={campaignPlan.industry}
                      onChange={(e) => updatePlan({ industry: e.target.value })}
                      className={`w-full px-4 py-3 bg-[#1a1a1a] border ${
                        errors.industry ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white focus:outline-none focus:border-cyan-500`}
                    >
                      <option value="">Select industry...</option>
                      <option value="automotive_ice">Automotive (ICE)</option>
                      <option value="automotive_ev">Automotive (EV)</option>
                      <option value="property_luxury">Property (Luxury)</option>
                      <option value="property_mid_range">Property (Mid-Range)</option>
                      <option value="property_affordable">Property (Affordable)</option>
                      <option value="fmcg">FMCG</option>
                      <option value="beauty">Beauty & Cosmetics</option>
                      <option value="retail_ecommerce">Retail / eCommerce</option>
                      <option value="telco">Telco</option>
                      <option value="finance_insurance">Finance / Insurance</option>
                      <option value="banking_fintech">Banking / Fintech</option>
                      <option value="tourism">Tourism</option>
                      <option value="tech_devices">Tech & Devices</option>
                      <option value="sme_b2b">SME / B2B</option>
                      <option value="entertainment_ott">Entertainment / OTT</option>
                      <option value="gaming">Gaming</option>
                      <option value="luxury">Luxury</option>
                      <option value="media_entertainment">Media / Entertainment</option>
                      <option value="professional_services">Professional Services</option>
                      <option value="education">Education</option>
                      <option value="f_and_b">F&B</option>
                      <option value="lifestyle">Lifestyle</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This connects to the KULT industry playbook to auto-suggest audiences and formats.
                    </p>
                    {errors.industry && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {errors.industry}</p>
                    )}
                  </div>

                  {/* Brand & Product */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Brand / product line
                    </label>
                    <input
                      type="text"
                      value={campaignPlan.brandProduct}
                      onChange={(e) => updatePlan({ brandProduct: e.target.value })}
                      placeholder="E.g. Brand X – EV sedan, Brand Y – collagen drink"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Short description of what we are advertising.
                    </p>
                  </div>

                  {/* Timing */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Planned flight dates (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Start date</label>
                        <input
                          type="date"
                          value={campaignPlan.startDate}
                          onChange={(e) => updatePlan({ startDate: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">End date</label>
                        <input
                          type="date"
                          value={campaignPlan.endDate}
                          min={campaignPlan.startDate || undefined}
                          onChange={(e) => updatePlan({ endDate: e.target.value })}
                          className={`w-full px-4 py-2.5 bg-[#1a1a1a] border rounded-lg text-white focus:outline-none ${
                            errors.endDate ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-cyan-500'
                          }`}
                        />
                        {errors.endDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      If dates are not confirmed, you can skip this. We'll still estimate weekly pacing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Audience */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      2. Who are you trying to reach?
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Save Audience Group Button */}
                      {campaignPlan.selectedPersonas.length > 0 && (
                        <button
                          onClick={() => setShowSaveAudienceModal(true)}
                          className="px-4 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-700 hover:border-cyan-600 rounded-lg text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2"
                          title="Save current audience selection"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Save Audience
                        </button>
                      )}
                      
                      {/* Load Saved Audience Button */}
                      <button
                        onClick={() => setShowLoadAudienceModal(true)}
                        className="px-4 py-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-700 hover:border-purple-600 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                        title="Load a saved audience group"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Load Saved
                      </button>
                      
                      {/* Clear All Button */}
                      {(campaignPlan.selectedPersonas.length > 0 || campaignPlan.massTargeting || campaignPlan.demographicFilters?.race?.length > 0 || campaignPlan.demographicFilters?.generation?.length > 0 || campaignPlan.demographicFilters?.income?.length > 0 || campaignPlan.selectedStates.length > 0) && (
                        <button
                          onClick={() => {
                            setCampaignPlan(prev => ({
                              ...prev,
                              selectedPersonas: [],
                              massTargeting: false,
                              demographicFilters: {
                                race: [],
                                generation: [],
                                income: []
                              },
                              selectedStates: []
                            }));
                            console.log('🗑️ Step 2: All audience selections cleared');
                          }}
                          className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                          title="Clear all audience selections and filters"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Choose the personas that matter. We will pull the right Astro audience segments and scale from there.
                  </p>
                </div>

                {/* Loading state for personas */}
                {isLoadingPersonas && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading personas...</p>
                    </div>
                  </div>
                )}

                {/* Show content only when personas are loaded */}
                {!isLoadingPersonas && availablePersonas.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-red-400 mb-2">⚠️ Failed to load personas</p>
                    <p className="text-gray-400 text-sm">Please refresh the page or contact support.</p>
                  </div>
                )}

                {!isLoadingPersonas && availablePersonas.length > 0 && (
                  <>

                <div className="space-y-6 bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
                  {/* Demographic & Geographic Filters */}
                  <div className="mb-6 p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-3">Audience Targeting Filters (Optional)</h3>
                    <p className="text-xs text-gray-400 mb-4">Narrow your audience by demographics and location. This will reduce the reach proportionally.</p>
                    
                    <div className="grid grid-cols-4 gap-4">
                      {/* Race Filter - Custom Checkbox Dropdown */}
                      <div className="relative">
                        <label className="block text-xs text-gray-400 mb-2">Race</label>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'race' ? null : 'race')}
                          className="w-full bg-[#0f0f0f] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 text-left flex items-center justify-between hover:border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <span className="truncate">
                            {campaignPlan.demographicFilters?.race?.length > 0 
                              ? `${campaignPlan.demographicFilters.race.length} selected`
                              : 'Select race...'}
                          </span>
                          <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openDropdown === 'race' && (
                          <div className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {['Malay', 'Chinese', 'Indian'].map(race => (
                              <label key={race} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={campaignPlan.demographicFilters.race.includes(race)}
                                  onChange={(e) => {
                                    const newRace = e.target.checked
                                      ? [...campaignPlan.demographicFilters.race, race]
                                      : campaignPlan.demographicFilters.race.filter(r => r !== race);
                                    updatePlan({ 
                                      demographicFilters: { 
                                        ...campaignPlan.demographicFilters, 
                                        race: newRace 
                                      } 
                                    });
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                                />
                                <span className="text-sm text-white flex-1">{race}</span>
                                <span className="text-xs text-gray-400">
                                  {race === 'Malay' ? '69.7%' : race === 'Chinese' ? '22.8%' : '6.7%'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Generation Filter - Custom Checkbox Dropdown */}
                      <div className="relative">
                        <label className="block text-xs text-gray-400 mb-2">Generation</label>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'generation' ? null : 'generation')}
                          className="w-full bg-[#0f0f0f] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 text-left flex items-center justify-between hover:border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <span className="truncate">
                            {campaignPlan.demographicFilters?.generation?.length > 0 
                              ? `${campaignPlan.demographicFilters.generation.length} selected`
                              : 'Select generation...'}
                          </span>
                          <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openDropdown === 'generation' && (
                          <div className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {[
                              { value: 'Gen Z', percent: '25.4%' },
                              { value: 'Millennials', percent: '30.3%' },
                              { value: 'Gen X', percent: '24.5%' },
                              { value: 'Boomers', percent: '19.8%' }
                            ].map(gen => (
                              <label key={gen.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={campaignPlan.demographicFilters.generation.includes(gen.value)}
                                  onChange={(e) => {
                                    const newGen = e.target.checked
                                      ? [...campaignPlan.demographicFilters.generation, gen.value]
                                      : campaignPlan.demographicFilters.generation.filter(g => g !== gen.value);
                                    updatePlan({ 
                                      demographicFilters: { 
                                        ...campaignPlan.demographicFilters, 
                                        generation: newGen 
                                      } 
                                    });
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                                />
                                <span className="text-sm text-white flex-1">{gen.value}</span>
                                <span className="text-xs text-gray-400">{gen.percent}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Income Filter - Custom Checkbox Dropdown */}
                      <div className="relative">
                        <label className="block text-xs text-gray-400 mb-2">Income</label>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'income' ? null : 'income')}
                          className="w-full bg-[#0f0f0f] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 text-left flex items-center justify-between hover:border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <span className="truncate">
                            {campaignPlan.demographicFilters?.income?.length > 0 
                              ? `${campaignPlan.demographicFilters.income.length} selected`
                              : 'Select income...'}
                          </span>
                          <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openDropdown === 'income' && (
                          <div className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {[
                              { value: 'B40', percent: '40%' },
                              { value: 'M40', percent: '40%' },
                              { value: 'T20', percent: '20%' }
                            ].map(income => (
                              <label key={income.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={campaignPlan.demographicFilters.income.includes(income.value)}
                                  onChange={(e) => {
                                    const newIncome = e.target.checked
                                      ? [...campaignPlan.demographicFilters.income, income.value]
                                      : campaignPlan.demographicFilters.income.filter(i => i !== income.value);
                                    updatePlan({ 
                                      demographicFilters: { 
                                        ...campaignPlan.demographicFilters, 
                                        income: newIncome 
                                      } 
                                    });
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                                />
                                <span className="text-sm text-white flex-1">{income.value}</span>
                                <span className="text-xs text-gray-400">{income.percent}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Geographic Filter - Custom Checkbox Dropdown */}
                      <div className="relative">
                        <label className="block text-xs text-gray-400 mb-2">Geography</label>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'geography' ? null : 'geography')}
                          className="w-full bg-[#0f0f0f] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 text-left flex items-center justify-between hover:border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <span className="truncate">
                            {campaignPlan.selectedStates.length > 0 
                              ? `${campaignPlan.selectedStates.length} states`
                              : 'All states (Nationwide)'}
                          </span>
                          <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openDropdown === 'geography' && (
                          <div className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            <div className="sticky top-0 bg-[#0f0f0f] border-b border-gray-700 px-3 py-2 flex gap-2">
                              <button
                                onClick={() => updatePlan({ selectedStates: [...availableStates] })}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                              >
                                Select All
                              </button>
                              <span className="text-xs text-gray-600">|</span>
                              <button
                                onClick={() => updatePlan({ selectedStates: [] })}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                              >
                                Clear
                              </button>
                            </div>
                            {[
                              { value: 'Federal Territory of Kuala Lumpur', label: 'Kuala Lumpur' },
                              { value: 'Selangor', label: 'Selangor' },
                              { value: 'Johor', label: 'Johor' },
                              { value: 'Perak', label: 'Perak' },
                              { value: 'Sabah', label: 'Sabah' },
                              { value: 'Sarawak', label: 'Sarawak' },
                              { value: 'Penang', label: 'Penang' },
                              { value: 'Kedah', label: 'Kedah' },
                              { value: 'Negeri Sembilan', label: 'Negeri Sembilan' },
                              { value: 'Malacca', label: 'Malacca' },
                              { value: 'Kelantan', label: 'Kelantan' },
                              { value: 'Terengganu', label: 'Terengganu' },
                              { value: 'Pahang', label: 'Pahang' },
                              { value: 'Putrajaya', label: 'Putrajaya' },
                              { value: 'Perlis', label: 'Perlis' },
                              { value: 'Labuan Federal Territory', label: 'Labuan' }
                            ].map(state => (
                              <label key={state.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={campaignPlan.selectedStates.includes(state.value)}
                                  onChange={(e) => {
                                    const newStates = e.target.checked
                                      ? [...campaignPlan.selectedStates, state.value]
                                      : campaignPlan.selectedStates.filter(s => s !== state.value);
                                    updatePlan({ selectedStates: newStates });
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                                />
                                <span className="text-sm text-white">{state.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personas */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Personas (KULT Audience Playbook) <span className="text-red-400">*</span>
                    </label>
                    <p className="text-sm text-gray-400 mb-4">
                      Select personas manually or use AI recommendations from the right panel →
                    </p>
                    
                    {/* Mass Targeting Option */}
                    <div className="mb-4 p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignPlan.massTargeting}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updatePlan({ 
                              massTargeting: isChecked,
                              selectedPersonas: isChecked ? availablePersonas.map(p => p.name) : []
                            });
                          }}
                          className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-white">Mass Targeting</span>
                          <p className="text-xs text-gray-400 mt-1">Target entire Malaysia population (16.15M) - use filters to refine</p>
                        </div>
                      </label>
                    </div>
                    
                    {/* Mass Targeting Info Message */}
                    {campaignPlan.massTargeting && (
                      <div className="mb-4 p-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">Mass Targeting Active</p>
                            <p className="text-xs text-gray-300">
                              Targeting the entire Malaysia population (16.15M base). Use demographic and geography filters above to refine your audience.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Search Input - Hidden when Mass Targeting */}
                    {!campaignPlan.massTargeting && (
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={personaSearchQuery}
                            onChange={(e) => setPersonaSearchQuery(e.target.value)}
                            placeholder="Search personas by name or category..."
                            className="w-full px-4 py-2 pl-10 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                          <svg 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {personaSearchQuery && (
                            <button
                              onClick={() => setPersonaSearchQuery('')}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Persona Grid - Hidden when Mass Targeting */}
                    {!campaignPlan.massTargeting && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                      {availablePersonas
                        .filter(persona => {
                          if (!personaSearchQuery) return true;
                          const query = personaSearchQuery.toLowerCase();
                          return (
                            persona.name.toLowerCase().includes(query) ||
                            persona.category.toLowerCase().includes(query)
                          );
                        })
                        .map((persona) => (
                        <button
                          key={persona.name}
                          onClick={() => togglePersona(persona.name)}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            campaignPlan.selectedPersonas.includes(persona.name)
                              ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20'
                              : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={`text-xs font-semibold ${
                              campaignPlan.selectedPersonas.includes(persona.name)
                                ? 'text-cyan-400'
                                : 'text-gray-500'
                            }`}>
                              {persona.category}
                            </div>
                            {campaignPlan.selectedPersonas.includes(persona.name) && (
                              <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-white mb-1">
                            {persona.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatNumber(persona.size)} users
                          </div>
                        </button>
                      ))}
                      {availablePersonas.filter(persona => {
                        if (!personaSearchQuery) return true;
                        const query = personaSearchQuery.toLowerCase();
                        return (
                          persona.name.toLowerCase().includes(query) ||
                          persona.category.toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p>No personas found matching "{personaSearchQuery}"</p>
                          <button
                            onClick={() => setPersonaSearchQuery('')}
                            className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm underline"
                          >
                            Clear search
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                    
                    {!campaignPlan.massTargeting && (
                      <>
                        <p className="text-xs text-gray-500 mt-2">
                          Start with 3–5 personas max. The planner can always scale up later.
                        </p>
                        {errors.personas && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {errors.personas}</p>
                        )}
                      </>
                    )}
                    
                    {!campaignPlan.massTargeting && campaignPlan.selectedPersonas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campaignPlan.selectedPersonas.map(persona => (
                          <span
                            key={persona}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500 text-white rounded-full text-sm"
                          >
                            {persona}
                            <button
                              onClick={() => togglePersona(persona)}
                              className="hover:text-gray-200"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Audience Overlap Analysis */}
                    {(() => {
                      const overlapData = calculatePersonaOverlap();
                      if (!overlapData) return null;

                      return (
                        <div className="mt-4 p-4 bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-700/50 rounded-lg">
                          <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Audience Overlap Analysis
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">{formatNumber(overlapData.totalRaw)}</div>
                              <div className="text-xs text-gray-400 mt-1">Total Raw Audience</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-400">{overlapData.overlapPercent}%</div>
                              <div className="text-xs text-gray-400 mt-1">Est. Overlap</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">{formatNumber(overlapData.uniqueReach)}</div>
                              <div className="text-xs text-gray-400 mt-1">Unique Reach</div>
                            </div>
                          </div>
                          <p className="text-xs text-purple-300 mt-3 italic">
                            Note: Overlap is estimated based on persona categories. Personas in the same category have ~60% overlap, different categories ~25%.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Language Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Target Language(s) <span className="text-red-400">*</span>
                      </label>
                      <p className="text-sm text-gray-400 mb-3">
                        Select the language(s) for your campaign creative and messaging
                      </p>
                      <div className="space-y-2 bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                        {['Bahasa Malaysia', 'English', 'Chinese'].map(language => (
                          <label
                            key={language}
                            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={campaignPlan.targetLanguages.includes(language)}
                              onChange={(e) => {
                                const newLanguages = e.target.checked
                                  ? [...campaignPlan.targetLanguages, language]
                                  : campaignPlan.targetLanguages.filter(l => l !== language);
                                updatePlan({ targetLanguages: newLanguages });
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                            />
                            <span className="text-sm text-white">{language}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                        <p className="text-xs text-yellow-400 flex items-start gap-2">
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span><strong>Note:</strong> Creative assets must be provided in the selected language(s). Ensure your content is culturally appropriate and professionally translated.</span>
                        </p>
                      </div>
                      {errors.targetLanguages && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {errors.targetLanguages}
                        </p>
                      )}
                    </div>

                    {/* Audience Group Management */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">Saved Audience Groups</h4>
                        <div className="flex gap-2">
                          {campaignPlan.selectedPersonas.length > 0 && (
                            <button
                              onClick={() => {
                                updatePlan({ 
                                  selectedPersonas: [],
                                  demographicFilters: { race: [], generation: [], income: [] }
                                });
                              }}
                              className="px-4 py-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg hover:bg-red-900/50 transition-colors text-sm font-semibold"
                            >
                              Clear Selection
                            </button>
                          )}
                          <button
                            onClick={() => {
                              loadSavedAudienceGroups();
                              setShowLoadAudienceModal(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Load Saved Audience
                          </button>
                          <button
                            onClick={() => {
                              setGroupName('');
                              setEditingGroupIndex(null);
                              setShowGroupModal(true);
                            }}
                            disabled={campaignPlan.selectedPersonas.length === 0}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              campaignPlan.selectedPersonas.length > 0
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            + Save Current Selection
                          </button>
                        </div>
                      </div>

                      {campaignPlan.audienceGroups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {campaignPlan.audienceGroups.map((group, index) => (
                            <div key={group.id} className="p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:border-cyan-500 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-white mb-1">{group.name}</h5>
                                  <p className="text-xs text-gray-400">
                                    {group.personas.length} persona{group.personas.length !== 1 ? 's' : ''}
                                    {(group.demographicFilters.race.length + group.demographicFilters.generation.length + group.demographicFilters.income.length) > 0 && 
                                      ` • ${group.demographicFilters.race.length + group.demographicFilters.generation.length + group.demographicFilters.income.length} filters`
                                    }
                                    {group.selectedStates && group.selectedStates.length > 0 && 
                                      ` • ${group.selectedStates.length} states`
                                    }
                                  </p>
                                  {group.uniqueReach > 0 && (
                                    <p className="text-xs font-semibold text-cyan-400 mt-1">
                                      Unique Reach: {(group.uniqueReach / 1000000).toFixed(2)}M
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => loadAudienceGroup(group)}
                                    className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                                    title="Load this group"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteAudienceGroup(index)}
                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete this group"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {group.personas.slice(0, 3).map(persona => (
                                  <span key={persona} className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 text-xs rounded">
                                    {persona}
                                  </span>
                                ))}
                                {group.personas.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                                    +{group.personas.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 px-4 bg-[#1a1a1a] border border-gray-700 border-dashed rounded-lg">
                          <p className="text-sm text-gray-400">No saved audience groups yet</p>
                          <p className="text-xs text-gray-500 mt-1">Select personas and click "Save Current Selection" above</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audience Intent */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Any specific intent or behaviours? (optional)
                    </label>
                    <textarea
                      value={campaignPlan.audienceIntent}
                      onChange={(e) => updatePlan({ audienceIntent: e.target.value })}
                      placeholder='E.g. "Test drive intenders", "Price-sensitive young families", "K-Drama binge watchers"'
                      rows={3}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This gives the AI a chance to refine the persona mix and channel weightage.
                    </p>
                  </div>

                  {/* Exclusions */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Anyone we should exclude? (optional)
                    </label>
                    <input
                      type="text"
                      value={campaignPlan.audienceExclusions}
                      onChange={(e) => updatePlan({ audienceExclusions: e.target.value })}
                      placeholder="E.g. existing customers, kids under 18, other regions"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                </div>

                {/* Save Audience Group Modal */}
                {showGroupModal && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f0f0f] border border-gray-700 rounded-xl p-6 max-w-md w-full">
                      <h3 className="text-lg font-bold text-white mb-4">
                        {editingGroupIndex !== null ? 'Edit Audience Group' : 'Save Audience Group'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-white mb-2">Group Name</label>
                          <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="E.g., Premium Auto Buyers, Young Families"
                            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            autoFocus
                          />
                        </div>

                        <div className="p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                          <p className="text-xs text-gray-400 mb-2">Selected Personas:</p>
                          <div className="flex flex-wrap gap-2">
                            {campaignPlan.selectedPersonas.map(persona => (
                              <span key={persona} className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded">
                                {persona}
                              </span>
                            ))}
                          </div>
                          {(campaignPlan.demographicFilters.race.length + campaignPlan.demographicFilters.generation.length + campaignPlan.demographicFilters.income.length) > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <p className="text-xs text-gray-400">Demographic Filters: {campaignPlan.demographicFilters.race.join(', ')}{campaignPlan.demographicFilters.race.length > 0 && ', '}{campaignPlan.demographicFilters.generation.join(', ')}{campaignPlan.demographicFilters.generation.length > 0 && ', '}{campaignPlan.demographicFilters.income.join(', ')}</p>
                            </div>
                          )}
                          {campaignPlan.selectedStates.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <p className="text-xs text-gray-400">
                                States: {campaignPlan.selectedStates.length === availableStates.length 
                                  ? 'All (Nationwide)' 
                                  : `${campaignPlan.selectedStates.slice(0, 3).join(', ')}${campaignPlan.selectedStates.length > 3 ? ` +${campaignPlan.selectedStates.length - 3} more` : ''}`
                                }
                              </p>
                            </div>
                          )}
                          {(() => {
                            const overlapData = calculatePersonaOverlap();
                            return overlapData && overlapData.uniqueReach > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <p className="text-xs font-semibold text-cyan-400">
                                  Estimated Unique Reach: {(overlapData.uniqueReach / 1000000).toFixed(2)}M
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowGroupModal(false);
                              setGroupName('');
                              setEditingGroupIndex(null);
                            }}
                            className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-gray-700 text-white rounded-lg hover:bg-[#222] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveAudienceGroup}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
                          >
                            Save Group
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Load Saved Audience Modal */}
                {showLoadAudienceModal && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f0f0f] border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Load Saved Audience</h3>
                        <button
                          onClick={() => setShowLoadAudienceModal(false)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {isLoadingSavedGroups ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-gray-400">Loading saved audiences...</div>
                        </div>
                      ) : savedAudienceGroups.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h4 className="text-white font-semibold mb-2">No Saved Audiences Yet</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Create audience groups in the AI Wizard or save your current selection first.
                          </p>
                          <button
                            onClick={() => setShowLoadAudienceModal(false)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {savedAudienceGroups.map((group) => (
                            <div 
                              key={group.id} 
                              className="p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:border-cyan-500 transition-all cursor-pointer"
                              onClick={() => loadSavedAudienceGroup(group)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold mb-1">{group.name}</h4>
                                  <p className="text-xs text-gray-400">
                                    {group.personas.length} personas • {((group.uniqueReach || group.unduplicated || 0) / 1000000).toFixed(2)}M reach
                                  </p>
                                  {(group.industry || group.objective) && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {group.industry && <span>{group.industry}</span>}
                                      {group.industry && group.objective && <span> • </span>}
                                      {group.objective && <span>{group.objective}</span>}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadSavedAudienceGroup(group);
                                  }}
                                  className="p-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-1 text-sm font-semibold"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Load
                                </button>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {group.personas.slice(0, 5).map((persona, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-cyan-900/20 border border-cyan-700/50 rounded text-xs text-cyan-300">
                                    {persona}
                                  </span>
                                ))}
                                {group.personas.length > 5 && (
                                  <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">
                                    +{group.personas.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </>
                )}

              </div>
            )}

            {/* Step 3: Budget */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      4. Where should your budget go?
                    </h2>
                    {(budgetChannels.length > 0 || campaignPlan.selectedSites.length > 0) && (
                      <button
                        onClick={() => {
                          setBudgetChannels([]);
                          setCampaignPlan(prev => ({
                            ...prev,
                            selectedSites: [],
                            optimisedGroups: []
                          }));
                          console.log('🗑️ All budget channels and sites cleared');
                        }}
                        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                        title="Clear all budget allocations and site selections"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Set your total budget, select sites, then allocate across channels. CPMs are based on your selected formats.
                  </p>
                </div>

                {/* Budget Overview Card */}
                <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Total Budget */}
                    <div>
                      <label className="block text-sm font-semibold text-cyan-400 mb-2">
                        Total Budget (RM) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={campaignPlan.totalBudget ? parseInt(campaignPlan.totalBudget).toLocaleString() : ''}
                        onChange={(e) => {
                          // Remove commas and non-numeric characters except for digits
                          const rawValue = e.target.value.replace(/[^0-9]/g, '');
                          updatePlan({ totalBudget: rawValue });
                        }}
                        placeholder="120,000"
                        className={`w-full px-4 py-3 bg-[#1a1a1a] border ${
                          errors.totalBudget ? 'border-red-500' : 'border-gray-700'
                        } rounded-lg text-white text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-cyan-500`}
                      />
                      {errors.totalBudget && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {errors.totalBudget}
                        </p>
                      )}
                    </div>

                    {/* Allocated Budget */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Allocated Budget
                      </label>
                      <div className="px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                        <span className="text-lg font-bold text-white">
                          RM {budgetChannels.reduce((sum, ch) => sum + ch.budget, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remaining Budget */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Remaining Balance
                      </label>
                      <div className={`px-4 py-3 border rounded-lg ${
                        calculateBudgetRemaining() < 0 
                          ? 'bg-red-900/30 border-red-500' 
                          : calculateBudgetRemaining() === 0 
                          ? 'bg-green-900/30 border-green-500'
                          : 'bg-[#1a1a1a] border-gray-700'
                      }`}>
                        <span className={`text-lg font-bold ${
                          calculateBudgetRemaining() < 0 
                            ? 'text-red-400' 
                            : calculateBudgetRemaining() === 0 
                            ? 'text-green-400'
                            : 'text-white'
                        }`}>
                          RM {calculateBudgetRemaining().toLocaleString()}
                        </span>
                      </div>
                      {calculateBudgetRemaining() < 0 && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Over budget!
                        </p>
                      )}
                      {errors.budgetAllocation && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1 bg-red-900/20 border border-red-500/30 rounded p-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {errors.budgetAllocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-400">Budget Allocation Progress</span>
                      <span className="text-xs font-semibold text-white">{calculateBudgetUsedPercent().toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          calculateBudgetUsedPercent() > 100 
                            ? 'bg-red-500' 
                            : calculateBudgetUsedPercent() === 100 
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-cyan-500 to-purple-600'
                        }`}
                        style={{ width: `${Math.min(calculateBudgetUsedPercent(), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Sites Selection - Merged into Budget & Sites step */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 mt-8">
                    Where should your ads run?
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    We've filtered recommended sites based on your audience and industry. You can pin must-have sites or let the planner optimise within a group.
                  </p>

                  <div className="space-y-4">
                    {Object.entries(getFilteredSites()).map(([channel, sites]) => {
                      const isExpanded = expandedChannels[channel] === true; // Default to collapsed
                      const selectedInChannel = sites.filter(s => campaignPlan.selectedSites.includes(s.id)).length;
                      const isOptimised = campaignPlan.optimisedGroups.includes(channel);
                      
                      return (
                        <div key={channel} className="bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden">
                          {/* Collapsible Header */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-900/50 transition-colors"
                            onClick={() => toggleChannelExpanded(channel)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleChannelExpanded(channel);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                <svg 
                                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <h3 className="text-lg font-bold text-white">{channel}</h3>
                              <span className="text-sm text-gray-400">
                                ({sites.length} sites available)
                              </span>
                              {(selectedInChannel > 0 || isOptimised) && (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  isOptimised 
                                    ? 'bg-purple-900/30 text-purple-400 border border-purple-700'
                                    : 'bg-cyan-900/30 text-cyan-400 border border-cyan-700'
                                }`}>
                                  {isOptimised ? '✓ Optimised' : `${selectedInChannel} selected`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Collapsible Content */}
                          {isExpanded && (
                            <div className="px-6 pb-6 pt-2">
                              <div className="flex items-center justify-between mb-4">
                                {/* Select All */}
                                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={sites.every(site => campaignPlan.selectedSites.includes(site.id))}
                                    onChange={() => selectAllSitesInChannel(channel, sites)}
                                    disabled={campaignPlan.optimisedGroups.includes(channel)}
                                    className="w-4 h-4 accent-cyan-500"
                                  />
                                  <span>Select All</span>
                                </label>
                                
                                {/* Optimise across group */}
                                <label className={`flex items-center gap-2 text-sm transition-colors ${
                                  (channel === 'OTT' ? selectedInChannel < 3 : selectedInChannel < 5) && !campaignPlan.optimisedGroups.includes(channel)
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-400 cursor-pointer hover:text-gray-300'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={campaignPlan.optimisedGroups.includes(channel)}
                                    onChange={() => toggleOptimisedGroup(channel)}
                                    disabled={(channel === 'OTT' ? selectedInChannel < 3 : selectedInChannel < 5) && !campaignPlan.optimisedGroups.includes(channel)}
                                    className="w-4 h-4 accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                      channel === 'OTT' 
                                        ? (selectedInChannel < 3 ? 'Select all 3 OTT sites to enable optimization' : 'Let the system optimize across selected sites')
                                        : (selectedInChannel < 5 ? 'Select at least 5 sites to enable optimization' : 'Let the system optimize across selected sites')
                                    }
                                  />
                                  <span>Optimise across this group automatically</span>
                                  {((channel === 'OTT' && selectedInChannel < 3) || (channel !== 'OTT' && selectedInChannel < 5)) && !campaignPlan.optimisedGroups.includes(channel) && (
                                    <span className="text-xs text-gray-600">
                                      {channel === 'OTT' ? '(need all 3 OTT sites)' : '(need 5+ sites)'}
                                    </span>
                                  )}
                                </label>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sites.map(site => {
                                  const isSelected = campaignPlan.selectedSites.includes(site.id);
                                  const isOptimised = campaignPlan.optimisedGroups.includes(channel);
                                  const isOptimisedAndSelected = isOptimised && isSelected;
                                  
                                  return (
                            <button
                              key={site.id}
                              onClick={() => toggleSite(site.id)}
                              disabled={isOptimised}
                              className={`p-4 rounded-lg border text-left transition-all ${
                                isOptimisedAndSelected
                                  ? 'bg-purple-900/20 border-purple-700'
                                  : isSelected
                                  ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                  : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-600'
                              }`}
                              title={site.description}
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <div className="text-cyan-400">
                                  <SiteIcon type={site.icon} />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-white mb-1">
                                    {site.name}
                                  </div>
                                  <div className="text-xs text-gray-400 mb-1">
                                    {site.category}
                                  </div>
                                  <div className="text-xs text-cyan-400">
                                    {site.traffic} available impressions
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                                    isOptimised ? 'bg-purple-500' : 'bg-cyan-500'
                                  }`}>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {site.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                                  </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {errors.sites && (
                    <p className="text-sm text-red-400 flex items-center gap-1 mt-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {errors.sites}
                    </p>
                  )}
                </div>

                {/* Channel Budget Cards */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Channel Budget Allocation</h3>
                  
                  {budgetChannels.length === 0 ? (
                    <div className="bg-[#0f0f0f] border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="text-lg font-semibold text-white mb-2">No channels added yet</h4>
                      <p className="text-sm text-gray-400 mb-4">
                        Click "Add to Plan" on AI recommendations →<br/>or manually add channels below
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {budgetChannels.map((channel) => (
                        <div key={channel.id} className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${channel.color}`}></div>
                              <h4 className="text-lg font-bold text-white">{channel.name}</h4>
                              {/* Show loading badge if 100% loading was applied */}
                              {channel.hasLoading && (
                                <span className="px-2 py-0.5 bg-amber-900/30 border border-amber-500/50 rounded text-xs font-semibold text-amber-400">
                                  +100% Loading
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-400">
                                {((channel.budget / (parseFloat(campaignPlan.totalBudget) || 1)) * 100).toFixed(1)}% of total
                              </div>
                              <button
                                onClick={() => setBudgetChannels(prev => prev.filter(ch => ch.id !== channel.id))}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                                title="Remove channel"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Budget Input */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-400 mb-2">
                                Budget (RM)
                              </label>
                              <input
                                type="text"
                                value={channel.budget ? parseInt(channel.budget).toLocaleString() : ''}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                  updateChannelBudget(channel.id, rawValue);
                                }}
                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>

                            {/* CPM (Read-only - based on selected formats) */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-400 mb-2">
                                CPM (RM)
                              </label>
                              <div className="px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg">
                                <span className="text-white font-semibold">
                                  {channel.cpm}
                                  {channel.hasLoading && (
                                    <span className="text-xs text-amber-400 ml-2">(100% Loading)</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Impressions (Read-only) */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-400 mb-2">
                                Est. Impressions
                              </label>
                              <div className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                                <span className="text-white font-semibold">
                                  {(channel.impressions / 1000000).toFixed(2)}M
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inventory Validation Warning */}
                {(() => {
                  // Calculate total booked impressions
                  const totalBookedImpressions = budgetChannels.reduce((sum, ch) => sum + (ch.impressions || 0), 0);
                  
                  // Calculate total available impressions from selected sites
                  const allSites = Object.values(availableSites).flat();
                  const selectedSiteObjects = allSites.filter(site => 
                    campaignPlan.selectedSites.includes(site.id)
                  );
                  const totalAvailableImpressions = selectedSiteObjects.reduce((sum, site) => {
                    // Convert traffic string like "37.9M" to number
                    const trafficStr = site.traffic || '0';
                    const value = parseFloat(trafficStr.replace('M', '')) * 1000000 || 
                                  parseFloat(trafficStr.replace('K', '')) * 1000 || 
                                  parseFloat(trafficStr) || 0;
                    return sum + value;
                  }, 0);
                  
                  // Calculate campaign duration in months
                  const startDate = campaignPlan.startDate ? new Date(campaignPlan.startDate) : null;
                  const endDate = campaignPlan.endDate ? new Date(campaignPlan.endDate) : null;
                  let campaignMonths = 1;
                  if (startDate && endDate && endDate >= startDate) {
                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    campaignMonths = Math.max(1, Math.ceil(diffDays / 30));
                  }
                  
                  // Adjust available impressions by campaign duration
                  const adjustedAvailableImpressions = totalAvailableImpressions * campaignMonths;
                  
                  // Check if over-booked
                  const isOverBooked = totalBookedImpressions > adjustedAvailableImpressions && budgetChannels.length > 0 && selectedSiteObjects.length > 0;
                  const utilizationPercent = adjustedAvailableImpressions > 0 
                    ? ((totalBookedImpressions / adjustedAvailableImpressions) * 100).toFixed(1)
                    : 0;
                  
                  if (!isOverBooked) return null;
                  
                  return (
                    <div className="bg-red-900/20 border-2 border-red-600 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-red-400 mb-2">
                            Insufficient Inventory Available
                          </h3>
                          <div className="space-y-3 text-sm text-gray-300">
                            <p>
                              <strong className="text-red-400">Your booked impressions exceed available inventory by {(utilizationPercent - 100).toFixed(1)}%</strong>
                            </p>
                            <div className="bg-black/40 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between">
                                <span>Booked Impressions:</span>
                                <span className="font-bold text-red-400">{(totalBookedImpressions / 1000000).toFixed(2)}M</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Available Impressions ({campaignMonths} month{campaignMonths > 1 ? 's' : ''}):</span>
                                <span className="font-bold text-cyan-400">{(adjustedAvailableImpressions / 1000000).toFixed(2)}M</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-gray-700">
                                <span>Utilization:</span>
                                <span className="font-bold text-red-400">{utilizationPercent}%</span>
                              </div>
                            </div>
                            
                            <div className="bg-amber-900/20 border border-amber-600 rounded-lg p-4 mt-4">
                              <p className="font-semibold text-amber-400 mb-2">💡 Recommendations:</p>
                              <ul className="list-disc list-inside space-y-1 text-gray-300">
                                {campaignMonths === 1 && (
                                  <li><strong>You have reached the maximum capacity for available impressions.</strong> Please select more sites (IPs) to fulfill the impressions required. Currently using {selectedSiteObjects.length} site{selectedSiteObjects.length !== 1 ? 's' : ''}. Add more OTT/Web sites to increase available inventory.</li>
                                )}
                                {campaignMonths > 1 && (
                                  <li><strong>Extend campaign period</strong> - Current: {campaignMonths} month{campaignMonths > 1 ? 's' : ''}. Longer campaigns increase available inventory.</li>
                                )}
                                <li><strong>Reduce budget allocation</strong> - Lower the budget for each channel to match available inventory.</li>
                                <li><strong>Enable "Optimize"</strong> - Let the system optimize across sites to maximize efficiency and remove 100% loading.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Additional Options */}
                <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 space-y-6">
                  {/* Budget Flexibility */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Budget Flexibility (optional)
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'fixed', label: 'Fixed – cannot exceed' },
                        { value: 'stretch_10', label: 'Can stretch by ~10%' },
                        { value: 'ballpark', label: 'Rough ballpark – open to recommendations' }
                      ].map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            campaignPlan.budgetFlexibility === option.value
                              ? 'bg-cyan-900/30 border-cyan-500'
                              : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="budgetFlexibility"
                            value={option.value}
                            checked={campaignPlan.budgetFlexibility === option.value}
                            onChange={(e) => updatePlan({ budgetFlexibility: e.target.value })}
                            className="w-4 h-4 accent-cyan-500"
                          />
                          <span className="text-sm text-white">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Buying Preference */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Buying Preference (optional)
                    </label>
                    <select
                      value={campaignPlan.buyingPreference}
                      onChange={(e) => updatePlan({ buyingPreference: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="no_preference">No preference</option>
                      <option value="direct_only">Direct only</option>
                      <option value="mix">Mix of Direct & Programmatic</option>
                      <option value="programmatic_first">Programmatic-first</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose how you prefer to buy media inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Formats */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      3. Which formats do you want to use?
                    </h2>
                    {campaignPlan.selectedFormats.length > 0 && (
                      <button
                        onClick={() => {
                          setCampaignPlan(prev => ({
                            ...prev,
                            selectedFormats: []
                          }));
                        }}
                        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All Formats
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Select formats first - this will determine CPMs for budget planning. Click any format card to add it to your plan.
                  </p>
                </div>

                {/* Inventory Summary for Selected Formats - MOVED TO TOP */}
                {campaignPlan.selectedFormats.length > 0 && (
                  <div className="bg-cyan-900/20 border border-cyan-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-lg font-bold text-white">Available Inventory for Selected Formats</h3>
                      </div>
                      {(() => {
                        const inventory = calculateAvailableInventory();
                        const formatsWithInventory = inventory.formats.filter(f => f.availableInventory > 0).length;
                        const totalSelected = campaignPlan.selectedFormats.length;
                        
                        return (
                          <span className={`text-xs px-2 py-1 rounded ${formatsWithInventory < totalSelected ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                            {totalSelected} format{totalSelected !== 1 ? 's' : ''} selected
                            {formatsWithInventory < totalSelected && (
                              <span className="ml-1">({formatsWithInventory} with inventory)</span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                    {(() => {
                      const inventory = calculateAvailableInventory();
                      const selectedLanguages = (campaignPlan.targetLanguages || []).map(l => l.toLowerCase());
                      const allLanguages = ['bahasa malaysia', 'english', 'chinese'];
                      const isAllLanguagesSelected = allLanguages.every(lang => 
                        selectedLanguages.some(sl => sl.includes(lang.split(' ')[0]))
                      );
                      const hasLanguageFilter = selectedLanguages.length > 0 && !isAllLanguagesSelected;
                      
                      if (inventory.availableInventory === 0) {
                        return (
                          <div className="text-sm text-gray-400">
                            <div className="flex items-center gap-2 text-yellow-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>No inventory data available for selected formats.</span>
                            </div>
                            {hasLanguageFilter && (
                              <p className="mt-2 ml-6">Try selecting formats with broader language support or changing your language selection.</p>
                            )}
                          </div>
                        );
                      }
                      
                      const formattedAvailable = inventory.availableInventory >= 1000000 
                        ? `${(inventory.availableInventory / 1000000).toFixed(1)}M` 
                        : inventory.availableInventory >= 1000 
                          ? `${Math.round(inventory.availableInventory / 1000)}K`
                          : inventory.availableInventory.toString();
                      
                      let inventoryLevel = 'High';
                      let inventoryColor = 'text-green-400';
                      let inventoryIcon = (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      );
                      let inventoryMessage = 'Excellent inventory availability for optimal campaign delivery.';
                      
                      if (inventory.availableInventory < 500000) {
                        inventoryLevel = 'Very Low';
                        inventoryColor = 'text-red-400';
                        inventoryIcon = (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        );
                        inventoryMessage = 'Limited inventory. Consider selecting additional formats with higher inventory for better reach.';
                      } else if (inventory.availableInventory < 5000000) {
                        inventoryLevel = 'Low';
                        inventoryColor = 'text-yellow-400';
                        inventoryIcon = (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        );
                        inventoryMessage = 'Moderate inventory. Adding more formats may improve campaign flexibility.';
                      } else if (inventory.availableInventory < 20000000) {
                        inventoryLevel = 'Medium';
                        inventoryColor = 'text-cyan-400';
                        inventoryIcon = (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        );
                        inventoryMessage = 'Good inventory availability for your selected formats.';
                      }
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300">Available Inventory:</span>
                            <span className={`text-2xl font-bold ${inventoryColor}`}>{formattedAvailable}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Inventory Level:</span>
                            <div className={`flex items-center gap-1 ${inventoryColor} font-semibold`}>
                              {inventoryIcon}
                              <span>{inventoryLevel}</span>
                            </div>
                          </div>
                          <div className="space-y-2 mt-2 pt-2 border-t border-gray-700">
                            {isAllLanguagesSelected ? (
                              <div className="flex items-center gap-2 text-xs text-cyan-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Language: All Languages (Mass Targeting)</span>
                              </div>
                            ) : hasLanguageFilter ? (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                <span>Language: {campaignPlan.targetLanguages.join(', ')}</span>
                              </div>
                            ) : null}
                            {inventory.personaRatio && inventory.personaRatio < 1.0 && (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Persona targeting: {(inventory.personaRatio * 100).toFixed(1)}% of base audience</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 p-3 bg-gray-900/50 rounded-lg space-y-2">
                            <p className={`text-sm ${inventoryColor}`}>{inventoryMessage}</p>
                            {(() => {
                              // Count formats with zero inventory
                              const formatsWithInventory = inventory.formats.filter(f => f.availableInventory > 0).length;
                              const formatsWithoutInventory = campaignPlan.selectedFormats.length - formatsWithInventory;
                              
                              return (
                                <>
                                  {formatsWithoutInventory > 0 && (
                                    <p className="text-xs text-yellow-400 flex items-start gap-2">
                                      <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      <span><strong>Note:</strong> {formatsWithoutInventory} selected format{formatsWithoutInventory !== 1 ? 's have' : ' has'} no inventory data (e.g., Social formats). Consider selecting other formats with available inventory.</span>
                                    </p>
                                  )}
                                  {campaignPlan.selectedFormats.length < 5 && formatsWithoutInventory === 0 && (
                                    <p className="text-xs text-gray-400 flex items-start gap-2">
                                      <svg className="w-3 h-3 flex-shrink-0 mt-0.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span><strong>Tip:</strong> Select more ad formats to increase available inventory. Total platform capacity is ~75M impressions/month for mass targeting.</span>
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isLoadingFormats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(availableFormats)
                      .map(([category, formats]) => {
                        const isCollapsed = collapsedFormatSections[category];
                        const selectedInCategory = formats.filter(f => campaignPlan.selectedFormats.includes(f.id)).length;
                        
                        return (
                    <div key={category} className="bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden">
                      {/* Collapsible Header */}
                      <button
                        onClick={() => toggleFormatSection(category)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="text-left">
                            <h3 className="text-lg font-bold text-white">{category}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {category === 'High Impact' && 'For launches, takeovers and big brand moments.'}
                              {category === 'Video' && 'Use these when sight, sound, and story matter.'}
                              {category === 'Display & Native' && 'Bread-and-butter reach and supporting inventory.'}
                              {category === 'Lead & Performance' && 'Formats that collect data, leads, or drive measurable actions.'}
                              {category === 'Interactive' && 'Use selectively to create engagement spikes, not as the only format.'}
                              {category === 'Social' && 'Optimized for social media platforms like Facebook, Instagram, and TikTok.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedInCategory > 0 && (
                            <span className="px-2 py-1 bg-cyan-900/30 border border-cyan-700 text-cyan-400 text-xs font-semibold rounded">
                              {selectedInCategory} selected
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formats.length} format{formats.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                      
                      {/* Collapsible Content */}
                      {!isCollapsed && (
                        <div className="px-6 pb-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formats.map(format => {
                          const isSelected = campaignPlan.selectedFormats.includes(format.id);
                          // Debug: Log to see ID matching
                          if (format.name === 'Masthead' || format.name === 'Leaderboard' || format.name === 'In-stream Video' || format.name === 'MREC') {
                            console.log(`🔍 ${format.name} check:`, {
                              formatId: format.id,
                              formatIdType: typeof format.id,
                              selectedFormats: campaignPlan.selectedFormats,
                              selectedFormatsLength: campaignPlan.selectedFormats.length,
                              selectedFormatsTypes: campaignPlan.selectedFormats.map(f => typeof f),
                              includes: campaignPlan.selectedFormats.includes(format.id),
                              isSelected: isSelected,
                              loadedCampaignExists: !!loadedCampaign,
                              urlParamId: id
                            });
                          }
                          
                          return (
                            <button
                              key={format.id}
                              onClick={() => toggleFormat(format.id)}
                              className={`p-4 rounded-lg border text-left transition-all relative ${
                                isSelected
                                  ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                  : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-600'
                              }`}
                            >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-white mb-1">
                                  {format.name}
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                  {format.description}
                                </div>
                                <div className="text-xs text-gray-500">
                                  <span className="text-cyan-400">Best for:</span> {format.bestFor}
                                </div>
                                {(() => {
                                  // Get inventory for this format
                                  const formatName = format.name.toLowerCase();
                                  const formatType = (format.type || '').toLowerCase();
                                  let inventoryKey = formatName;
                                  let useMultipleInventories = false;
                                  let inventoryKeys = [];
                                  
                                  // Map format names to inventory keys
                                  // Video formats
                                  if (formatName.includes('instream') || formatName.includes('in-stream')) {
                                    inventoryKey = 'pre/midroll';
                                  } else if (formatName.includes('pre-roll')) {
                                    inventoryKey = 'preroll';
                                  } else if (formatName.includes('mid-roll')) {
                                    inventoryKey = 'midroll';
                                  } 
                                  // Social formats
                                  else if (formatName.includes('image social')) {
                                    inventoryKey = 'social static ad';
                                  } else if (formatName.includes('video social')) {
                                    inventoryKey = 'social video ad';
                                  }
                                  // High-impact formats (share inventory with standard formats)
                                  else if (formatName.includes('skinner') || formatName.includes('wallpaper')) {
                                    inventoryKey = 'masthead'; // Skinner/Wallpaper uses Masthead inventory
                                  } else if (formatName.includes('takeover')) {
                                    inventoryKey = 'interstitial'; // Site Takeover uses Interstitial inventory
                                  }
                                  // Interactive formats (combination of 6 digital sizes)
                                  else if (formatType.includes('interactive')) {
                                    useMultipleInventories = true;
                                    inventoryKeys = ['leaderboard', 'mrec', 'masthead', 'interstitial', 'catfish', 'in article'];
                                  }
                                  
                                  let inventory = null;
                                  let requests = 0;
                                  let impressions = 0;
                                  
                                  // Handle single inventory lookup
                                  if (!useMultipleInventories) {
                                    inventory = formatInventory[inventoryKey];
                                  }
                                  
                                  // Calculate inventory - handle both single and multiple sources
                                  const selectedLanguages = (campaignPlan.targetLanguages || []).map(l => l.toLowerCase());
                                  
                                  if (useMultipleInventories) {
                                    // Interactive formats: combine inventory from multiple standard formats
                                    inventoryKeys.forEach(key => {
                                      const inv = formatInventory[key];
                                      if (inv) {
                                        if (selectedLanguages.length > 0) {
                                          inv.byLanguage.forEach(langData => {
                                            const langKey = langData.language.toLowerCase();
                                            if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
                                              requests += langData.totalRequests / 12;
                                              impressions += langData.totalImpressions / 12;
                                            }
                                          });
                                        } else {
                                          requests += inv.avgMonthlyRequests;
                                          impressions += inv.avgMonthlyImpressions;
                                        }
                                      }
                                    });
                                  } else if (inventory) {
                                    // Single inventory source
                                    if (selectedLanguages.length > 0) {
                                      // Filter by language
                                      inventory.byLanguage.forEach(langData => {
                                        const langKey = langData.language.toLowerCase();
                                        if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
                                          // Divide by 12 for consistency with backend avgMonthly calculations
                                          requests += langData.totalRequests / 12; // Monthly average
                                          impressions += langData.totalImpressions / 12; // Monthly average
                                        }
                                      });
                                    } else {
                                      // No language filter, use total
                                      requests = inventory.avgMonthlyRequests;
                                      impressions = inventory.avgMonthlyImpressions;
                                    }
                                  }
                                  
                                  // Only show inventory if we have data
                                  if (inventory || useMultipleInventories) {
                                    if (requests > 0 && impressions > 0) {
                                      
                                      // Calculate available impressions (requests - impressions served)
                                      // Apply 75% safety buffer (show only 25% of capacity) to avoid overbooking
                                      const rawAvailable = requests - impressions;
                                      let availableImpressions = rawAvailable * 0.25;
                                      
                                      // Apply persona targeting ratio (e.g., Entertainment = 21% of base)
                                      const personaRatio = calculatePersonaRatio();
                                      availableImpressions = availableImpressions * personaRatio;
                                      
                                      if (availableImpressions > 0) {
                                        const formattedAvailable = availableImpressions >= 1000000 
                                          ? `${(availableImpressions / 1000000).toFixed(1)}M` 
                                          : availableImpressions >= 1000 
                                            ? `${Math.round(availableImpressions / 1000)}K`
                                            : Math.round(availableImpressions).toString();
                                        
                                        // Color code based on inventory level
                                        let inventoryColor = 'text-green-400';
                                        if (availableImpressions < 100000) inventoryColor = 'text-red-400'; // Very low
                                        else if (availableImpressions < 1000000) inventoryColor = 'text-yellow-400'; // Low
                                        else if (availableImpressions < 10000000) inventoryColor = 'text-cyan-400'; // Medium
                                        
                                        return (
                                          <div className={`text-xs mt-1 ${inventoryColor} flex items-center gap-1`}>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            {formattedAvailable} available impressions
                                          </div>
                                        );
                                      }
                                    }
                                  }
                                  
                                  // Show "No inventory data" for formats without inventory
                                  return (
                                    <div className="text-xs mt-1 text-gray-500 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      No inventory data
                                    </div>
                                  );
                                })()}
                              </div>
                              {campaignPlan.selectedFormats.includes(format.id) && (
                                <div className="ml-3 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {format.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-purple-900/30 text-purple-300 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </button>
                          );
                        })}
                      </div>
                        </div>
                      )}
                    </div>
                        );
                      })}
                  </div>
                )}

                {errors.formats && (
                  <p className="text-sm text-red-400 flex items-center gap-1"><svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {errors.formats}</p>
                )}
                {errors.formatsWarning && (
                  <p className="text-sm text-yellow-400 flex items-center gap-1"><svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.formatsWarning}</p>
                )}

              </div>
            )}

            {/* Step 5: Summary */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      5. Review & lock your plan
                    </h2>
                    {campaignPlan.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaignPlan.status === 'booked' 
                          ? 'bg-green-900/30 text-green-400 border border-green-700'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {campaignPlan.status === 'booked' ? '✓ Booked' : 'Draft'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Here's the draft plan based on your inputs and the KULT playbook. You can still edit any step above before sharing with your client or manager.
                  </p>
                </div>

                <div className="space-y-4 bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
                  {/* Campaign Overview */}
                  <div className="border-b border-gray-800 pb-4">
                    <h3 className="text-lg font-bold text-white mb-3">Campaign Overview</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Campaign Name:</span>
                        <div className="text-white font-semibold">{campaignPlan.campaignName || 'Untitled Campaign'}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Objective:</span>
                        <div className="text-white font-semibold">{campaignPlan.objective}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Industry:</span>
                        <div className="text-white font-semibold">{campaignPlan.industry}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Geography:</span>
                        <div className="text-white font-semibold">
                          {campaignPlan.selectedStates.length === 0 || campaignPlan.selectedStates.length === availableStates.length
                            ? 'Nationwide (All States)'
                            : `${campaignPlan.selectedStates.length} selected states`
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audience */}
                  <div className="border-b border-gray-800 pb-4">
                    <h3 className="text-lg font-bold text-white mb-3">Audience Selection</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaignPlan.massTargeting ? (
                        <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm font-semibold">
                          Mass Targeting
                        </span>
                      ) : (
                        campaignPlan.selectedPersonas.map(persona => (
                          <span
                            key={persona}
                            className="px-3 py-1 bg-cyan-900/30 text-cyan-300 rounded-full text-sm"
                          >
                            {persona}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="border-b border-gray-800 pb-4">
                    <h3 className="text-lg font-bold text-white mb-3">Budget Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Budget:</span>
                        <div className="text-white font-semibold text-xl">
                          RM {parseFloat(campaignPlan.totalBudget || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Estimated Impressions:</span>
                        <div className="text-cyan-400 font-semibold text-xl">
                          {formatNumber(campaignPlan.estimatedImpressions)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formats */}
                  <div className="border-b border-gray-800 pb-4">
                    <h3 className="text-lg font-bold text-white mb-3">
                      Formats Selected ({campaignPlan.selectedFormats.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {campaignPlan.selectedFormats.map(formatId => {
                        const format = Object.values(availableFormats)
                          .flat()
                          .find(f => f.id === formatId);
                        return format ? (
                          <div
                            key={formatId}
                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-sm text-white"
                          >
                            {format.name}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Sites */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">
                      Sites ({campaignPlan.selectedSites.length} selected + {campaignPlan.optimisedGroups.length} optimised groups)
                    </h3>
                    <div className="space-y-2">
                      {campaignPlan.selectedSites.map(siteId => {
                        const sitesData = Object.keys(availableSites).length > 0 ? availableSites : SITES_DATABASE;
                        const site = Object.values(sitesData)
                          .flat()
                          .find(s => s.id === siteId);
                        return site ? (
                          <div
                            key={siteId}
                            className="flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-sm"
                          >
                            <span className="text-cyan-400">
                              <SiteIcon type={site.icon} />
                            </span>
                            <span className="text-white">{site.name}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400 text-xs">{site.category}</span>
                          </div>
                        ) : null;
                      })}
                      {campaignPlan.optimisedGroups.map(channel => (
                        <div
                          key={channel}
                          className="px-3 py-2 bg-purple-900/20 border border-purple-700 rounded text-sm text-purple-300 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI-optimised: {channel}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500">
                    All numbers shown are estimates and should be validated against latest rate cards and inventory availability.
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  {/* Primary Actions */}
                  <div className="flex justify-center">
                    <button 
                      onClick={handleSaveDraft}
                      className="px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-white rounded-lg hover:bg-[#222] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save as draft
                    </button>
                  </div>

                  {/* Export Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={handleExportPDF}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-cyan-500/50 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Export to PDF
                    </button>
                  <button 
                    onClick={handleExportExcel}
                    className="px-6 py-3 bg-green-900/30 border border-green-700 text-green-300 rounded-lg hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-800 mt-8">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  currentStep === 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-[#1a1a1a] border border-gray-700 text-white hover:bg-[#222]'
                }`}
              >
                ← Back
              </button>

              <button
                onClick={handleNext}
                disabled={currentStep === 5 && campaignPlan.status === 'booked'}
                className={`px-8 py-3 font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                  currentStep === 5
                    ? campaignPlan.status === 'booked'
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/50'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 hover:shadow-cyan-500/50'
                }`}
                title={currentStep === 5 && !campaignPlan.id ? 'Save as draft first' : currentStep === 5 && campaignPlan.status === 'booked' ? 'Already booked' : ''}
              >
                {currentStep === 5 ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {campaignPlan.status === 'booked' ? '✓ Booked' : 'Book Now'}
                  </>
                ) : (
                  'Next →'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - AI Recommendations (Desktop) */}
          <div className="hidden lg:block w-96 flex-shrink-0">
            <div className="sticky top-6 h-[calc(100vh-8rem)]">
              <AIRecommendationsPanel
                currentStep={currentStep === 2 ? 'audience' : 
                           currentStep === 3 ? 'formats' :
                           currentStep === 4 ? 'budget' :
                           currentStep === 5 ? 'overview' : 'overview'}
                recommendations={aiRecommendations}
                onAddRecommendation={handleAddRecommendation}
                selectedItems={getSelectedItemIds()}
                isLoading={isLoadingRecommendations}
              />
            </div>
          </div>
          
          {/* Save as Draft - Floating Button (Hidden on Step 5) */}
          {currentStep !== 5 && (
            <button
              onClick={handleSaveDraft}
              className="fixed bottom-20 right-4 z-50 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-5 py-3 rounded-full shadow-2xl transition-all flex items-center gap-2"
              title="Save your progress as draft"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="font-semibold hidden sm:inline">Save Draft</span>
            </button>
          )}
          
          {/* Mobile AI Recommendations - Floating Button */}
          {currentStep >= 2 && (
            <button
              onClick={() => setShowMobileAI(true)}
              className="lg:hidden fixed bottom-36 right-4 z-50 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center gap-2 animate-pulse"
              style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="font-semibold">AI Suggestions</span>
              {aiRecommendations.length > 0 && (
                <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {aiRecommendations.length}
                </span>
              )}
            </button>
          )}
          
          {/* Mobile AI Recommendations - Full Screen Modal */}
          {showMobileAI && (
            <div className="lg:hidden fixed inset-0 bg-black/90 z-50 overflow-y-auto">
              <div className="min-h-screen p-4 pb-20">
                {/* Header */}
                <div className="sticky top-0 bg-[#0f0f0f] border-b border-gray-800 p-4 mb-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-cyan-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI Recommendations
                  </h2>
                  <button
                    onClick={() => setShowMobileAI(false)}
                    className="text-gray-400 hover:text-white p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* AI Panel Content */}
                <AIRecommendationsPanel
                  currentStep={currentStep === 2 ? 'audience' : 
                             currentStep === 3 ? 'formats' :
                             currentStep === 4 ? 'budget' :
                             currentStep === 5 ? 'overview' : 'overview'}
                  recommendations={aiRecommendations}
                  onAddRecommendation={(item) => {
                    handleAddRecommendation(item);
                    // Optional: Close modal after adding
                    // setShowMobileAI(false);
                  }}
                  selectedItems={getSelectedItemIds()}
                  isLoading={isLoadingRecommendations}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Plan Summary */}
        {/* Hide PlanSummary on Step 5 since it has its own action buttons */}
        {currentStep !== 5 && (
          <PlanSummary
            planData={{
              audiences: campaignPlan.selectedPersonas,
              geographies: campaignPlan.selectedStates.length > 0 
                ? campaignPlan.selectedStates 
                : ['Nationwide'],
              formats: campaignPlan.selectedFormats,
              sites: campaignPlan.selectedSites,
              totalBudget: parseInt(campaignPlan.totalBudget) || 0
            }}
            onGeneratePlan={() => setCurrentStep(6)}
            isComplete={isPlanComplete()}
          />
        )}

        {/* Save Version Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
              <h3 className="text-white font-bold text-lg mb-4">Save Changes</h3>
              <p className="text-gray-400 text-sm mb-6">
                This campaign already exists. Would you like to overwrite it or save as a new version?
              </p>
              
              {/* New Version Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-2">
                  New Version Name (optional)
                </label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder={`${campaignPlan.campaignName} (v2)`}
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use auto-generated name
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    performSave(saveAction, true); // Save as new version
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all"
                >
                  Save as New Version
                </button>
                <button
                  onClick={() => {
                    performSave(saveAction, false); // Overwrite existing
                  }}
                  className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Overwrite Existing
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewVersionName('');
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">Campaign saved as draft!</h3>
                  <p className="text-gray-400 text-sm">
                    You can continue editing later from the "Campaign Plans" page.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Success Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-green-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">Booking submitted successfully!</h3>
                  <p className="text-gray-400 text-sm">
                    Your booking has been sent to the sales team. They will contact you shortly to confirm.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear Data Notification Modal */}
        {showClearDataModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-amber-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">Data Cleared</h3>
                  <p className="text-gray-400 text-sm">
                    {clearDataMessage}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Please re-select them in Step 4.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowClearDataModal(false)}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Audience Group Modal */}
        {showSaveAudienceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-cyan-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Save Audience Group</h3>
              <p className="text-gray-400 text-sm mb-4">
                Save your current audience selection ({campaignPlan.selectedPersonas.length} personas) for reuse in future campaigns.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
                <input
                  type="text"
                  value={audienceGroupName}
                  onChange={(e) => setAudienceGroupName(e.target.value)}
                  placeholder="e.g., Tech-Savvy Millennials"
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveAudienceModal(false);
                    setAudienceGroupName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  disabled={isSavingAudience}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAudienceGroup}
                  disabled={isSavingAudience || !audienceGroupName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingAudience ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Saved Audience Modal */}
        {showLoadAudienceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-purple-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Load Saved Audience</h3>
                <button
                  onClick={() => setShowLoadAudienceModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {isLoadingSavedGroups ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading saved groups...</p>
                  </div>
                </div>
              ) : savedAudienceGroups.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h4 className="text-lg font-semibold text-white mb-2">No Saved Audiences</h4>
                  <p className="text-gray-400 text-sm">
                    Save your first audience group to reuse it in future campaigns.
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 space-y-3">
                  {savedAudienceGroups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-[#0f0f0f] border border-gray-800 hover:border-purple-700 rounded-lg p-4 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-1">{group.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{group.personas.length} personas</span>
                            <span>•</span>
                            <span>{((group.uniqueReach || 0) / 1000000).toFixed(2)}M reach</span>
                            {group.source && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{group.source.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAudienceGroup(group.id);
                          }}
                          className="p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 text-red-400 hover:text-red-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete group"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {group.personas.slice(0, 3).map((persona, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-900/20 border border-purple-700/50 rounded text-xs text-purple-300"
                            >
                              {persona}
                            </span>
                          ))}
                          {group.personas.length > 3 && (
                            <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">
                              +{group.personas.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {(group.industry || group.objective) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          {group.industry && <span className="text-gray-400">{group.industry}</span>}
                          {group.industry && group.objective && <span>•</span>}
                          {group.objective && <span className="text-gray-400">{group.objective}</span>}
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleLoadAudienceGroup(group)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all"
                      >
                        Load This Audience
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generic Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`bg-[#1a1a1a] border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl ${
              confirmModalConfig.type === 'danger' ? 'border-red-700' : 
              confirmModalConfig.type === 'warning' ? 'border-amber-700' : 
              'border-blue-700'
            }`}>
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  {confirmModalConfig.type === 'danger' ? (
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : confirmModalConfig.type === 'warning' ? (
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">{confirmModalConfig.title}</h3>
                  <p className="text-gray-400 text-sm whitespace-pre-line">
                    {confirmModalConfig.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {confirmModalConfig.cancelText && (
                  <button
                    onClick={confirmModalConfig.onCancel}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {confirmModalConfig.cancelText}
                  </button>
                )}
                {confirmModalConfig.confirmText && (
                  <button
                    onClick={confirmModalConfig.onConfirm}
                    className={`px-6 py-2 rounded-lg transition-colors text-white ${
                      confirmModalConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                      confirmModalConfig.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {confirmModalConfig.confirmText}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default BuildPlanWizard;
