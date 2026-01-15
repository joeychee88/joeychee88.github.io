import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CampaignBriefPanel from '../components/CampaignBriefPanel';
import { useAIChat } from '../hooks/useAIChat';
import axios from 'axios';

// API configuration
const API_BASE_URL = '/api'; // Use relative path for Vite proxy
import verticalPlaybook from '../data/verticalPlaybook.json';
import {
  getIndustryPlaybook,
  getGenericPlaybook,
  normalizeIndustryKey,
  isCriticalFitIndustry,
  getFallbackPersonas,
  CHANNEL_CONSTRAINTS,
  calculateChannelShares,
  rebalanceToMeetMinShare
} from '../utils/strategicPlannerHelpers';
import {
  calculatePersonaRatio,
  calculateAvailableInventory,
  validateInventoryCapacity,
  getOverlapFactor,
  calculateUniqueReach,
  getCompatibleSites,
  filterSitesByLanguage,
  determineBudgetTier,
  validateTierCompliance,
  applyChannelLoading,
  calculateTierAllocations,
  scoreAudienceByGeo,
  calculateGeoRelevance,
  detectRegionalSite,
  scoreSiteByGeo,
  prioritizeAudiencesByGeo,
  prioritizeSitesByGeo,
  generatePlanSummaryText,
  formatNumber
} from '../utils/advancedPlanningHelpers';
import {
  scoreFormats,
  scoreSites,
  generateOptimizationStrategy,
  calculateAccuratePricing,
  enrichWithBenchmarks
} from '../utils/aiWizardIntelligence';
import { parseFuzzyDateRange, formatDateRange, validateDateRange } from '../utils/dateParser';

function AIWizard() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  
  // OpenAI-powered AI chat hook
  const { sendMessage: sendAIMessage, cancelRequest: cancelAIRequest, isLoading: aiChatLoading, error: aiChatError } = useAIChat();
  
  // Use ref to avoid closure issues with datasets
  const datasetsRef = useRef({
    rates: [],
    formats: [],
    audiences: [],
    sites: []
  });
  
  const inputRef = useRef(null); // Reference to input field for auto-focus
  const pendingRequestRef = useRef(false); // Prevent duplicate API calls
  const conversationIdRef = useRef(Date.now().toString()); // Unique conversation ID
  
  // Extracted campaign brief (built from conversation)
  const [brief, setBrief] = useState({
    campaignName: null,
    product_brand: null,
    campaign_objective: null,
    industry: null,
    startDate: null, // Campaign start date for dynamic pricing
    budget_rm: null,
    geography: [],
    audience: null,
    duration_weeks: null,
    devices: [],
    buying_type: null,
    priority: null,
    channel_preference: null, // 'OTT', 'Social', 'Display', or null for balanced
    // NEW: Context gathering fields for Package 3
    creative_assets: null, // 'video', 'static', 'both', 'none'
    geography_specificity: null, // 'nationwide', 'klang_valley', 'major_cities', 'specific_regions'
    buying_preference: null, // 'direct', 'programmatic', 'mixed'
    _extractionLog: [], // Track what we've learned
    _budgetAsked: false, // Prevent repeated budget questions
    _needsBudgetSuggestion: false,
    _budgetSuggested: false,
    _showingTiers: false, // Currently showing budget tiers
    // NEW: Phase tracking for strategic conversation
    _contextGatheringPhase: 'initial', // 'initial', 'gathering', 'complete'
    _contextQuestionsAsked: {
      creative_assets: false,
      duration: false,
      geography_specificity: false,
      buying_preference: false
    }
  });
  
  const [recommendations, setRecommendations] = useState(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false); // Track Campaign Brief Panel collapse state
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false); // Track if intro message was already sent
  
  // NEW: Save Audience Group state
  const [showSaveAudienceModal, setShowSaveAudienceModal] = useState(false);
  const [audienceGroupName, setAudienceGroupName] = useState('');
  const [savedAudienceGroups, setSavedAudienceGroups] = useState([]);
  
  // NEW: Message feedback state (thumbs up/down)
  const [messageFeedback, setMessageFeedback] = useState({}); // { messageIndex: 'like' | 'dislike' | null }
  const [showReportMenu, setShowReportMenu] = useState(null); // Track which message's report menu is open
  const [comparisonMode, setComparisonMode] = useState({}); // { messageIndex: { optionA: response, optionB: response, loading: bool } }
  const [generatingComparison, setGeneratingComparison] = useState(null); // Track which message is generating comparison
  
  // NEW: Clear confirmation modal state
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  
  // NEW: Persona constraints for filtering
  const [personaConstraints, setPersonaConstraints] = useState({
    blacklist: [], // Personas user explicitly doesn't want (e.g., "moms", "youth mom")
    whitelist: []  // Personas user explicitly wants (e.g., "luxury buyers", "young professionals")
  });
  
  // Handler to update brief from panel edits
  const handleBriefUpdate = (fieldKey, newValue) => {
    console.log(`📝 [PANEL EDIT] Updating ${fieldKey} to:`, newValue);
    setBrief(prev => ({
      ...prev,
      [fieldKey]: newValue
    }));
  };

  // Datasets - THE ONLY SOURCE OF TRUTH
  const [datasets, setDatasets] = useState({
    rates: [],
    formats: [],
    audiences: [],
    sites: []
  });
  
  // NEW: Format inventory data for validation
  const [formatInventory, setFormatInventory] = useState({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const conversationData = {
        messages,
        brief,
        timestamp: new Date().toISOString(),
        recommendations
      };
      localStorage.setItem('ai_wizard_conversation', JSON.stringify(conversationData));
      console.log('💾 [AUTO-SAVE] Conversation saved to localStorage');
    }
  }, [messages, brief, recommendations]);

  // Auto-restore conversation on mount
  useEffect(() => {
    const savedConversation = localStorage.getItem('ai_wizard_conversation');
    if (savedConversation && !hasInitialized.current) {
      try {
        const data = JSON.parse(savedConversation);
        const savedTime = new Date(data.timestamp);
        const now = new Date();
        const hoursSince = (now - savedTime) / (1000 * 60 * 60);
        
        // Only restore if saved within last 24 hours
        if (hoursSince < 24 && data.messages.length > 0) {
          // Convert timestamp strings back to Date objects
          const messagesWithDates = data.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          
          setMessages(messagesWithDates);
          setBrief(data.brief || {});
          setRecommendations(data.recommendations || null);
          hasInitialized.current = true;
          console.log(`✅ [AUTO-RESTORE] Restored conversation from ${hoursSince.toFixed(1)}h ago`);
          return;
        }
      } catch (error) {
        console.error('❌ [AUTO-RESTORE] Failed to restore conversation:', error);
        // Clear corrupted data
        localStorage.removeItem('ai_wizard_conversation');
      }
    }
  }, []);

  // Auto-focus input field after AI responds
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  useEffect(() => {
    console.log('🚀 AI Wizard v2.1 - Entity Extraction Enhanced');
    console.log('📦 Initial datasets state:', datasets);
    loadDatasets();
    
    // Only add intro message on first mount (prevents double-mount in Strict Mode)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Get the AI's initial greeting from backend (Step 0: Campaign name question)
      addMessage('assistant', "What's your campaign name?", { currentStep: 0, showActions: false });
    }
  }, []);

  // Debug: Log whenever datasets change
  useEffect(() => {
    console.log('🔄 Datasets state changed:', {
      rates: datasets.rates.length,
      formats: datasets.formats.length,
      audiences: datasets.audiences.length,
      sites: datasets.sites.length
    });
  }, [datasets]);

  const loadDatasets = async () => {
    try {
      console.log('🔄 [FAST-LOAD] Loading datasets in background...');
      
      // Load data in background without blocking render
      const [ratesRes, formatsRes, audienceRes, sitesRes] = await Promise.all([
        axios.get('/api/rates').catch(() => ({ data: { data: [] } })),
        axios.get('/api/formats').catch(() => ({ data: { data: [] } })),
        axios.get('/api/audience').catch(() => ({ data: { data: [] } })),
        axios.get('/api/inventory').catch(() => ({ data: { data: [] } }))
      ]);

      console.log('✅ [FAST-LOAD] API responses received');

      // Use setTimeout to defer heavy processing
      setTimeout(() => {
        console.log('🔄 [FAST-LOAD] Processing data...');
        
        // Transform audience data to match expected structure
        let transformedAudiences = [];
        try {
          transformedAudiences = (audienceRes.data.data || []).map(a => {
            // Calculate total audience across all states
            // Numbers come as strings with commas (e.g., "1,540,000")
            const stateKeys = Object.keys(a).filter(k => k !== 'Personas' && k !== 'Industry Interests' && k !== 'id');
            const totalAudience = stateKeys.reduce((sum, key) => {
              try {
                const strVal = String(a[key] || '0').replace(/,/g, ''); // Remove commas
                const val = parseInt(strVal);
                return sum + (isNaN(val) ? 0 : val);
              } catch (e) {
                return sum;
              }
            }, 0);

            // Extract interests from 'Industry Interests' field
            const interestsStr = a['Industry Interests'] || '';
            const interests = interestsStr ? interestsStr.split(',').map(i => i.trim()).filter(i => i) : [];

            return {
              persona: a.Personas || 'Unknown Audience',
              totalAudience,
              interests,
              ...a // Keep original data
            };
          });
        } catch (audienceError) {
          console.error('⚠️ Error transforming audiences:', audienceError);
          transformedAudiences = audienceRes.data.data || [];
        }

      // Transform site/inventory data to extract unique IPs with traffic
      let transformedSites = [];
      try {
        const siteMap = new Map();
        (sitesRes.data.data || []).forEach(item => {
          const siteName = item.IP || item.Entity || 'Unknown Site';
          const category = item.Property || 'Web';
          const impressions = parseInt(item['Total impressions']) || 0;
          
          if (siteMap.has(siteName)) {
            siteMap.get(siteName).monthlyTraffic += impressions;
          } else {
            siteMap.set(siteName, {
              name: siteName,
              category,
              monthlyTraffic: impressions,
              entity: item.Entity
            });
          }
        });
        transformedSites = Array.from(siteMap.values());
      } catch (siteError) {
        console.error('⚠️ Error transforming sites:', siteError);
        transformedSites = sitesRes.data.data || [];
      }

      const loadedDatasets = {
        rates: ratesRes.data.data || [],
        formats: formatsRes.data.data || [],
        audiences: transformedAudiences,
        sites: transformedSites
      };

      console.log('✅ [FAST-LOAD] Datasets processed:', {
        rates: loadedDatasets.rates.length,
        formats: loadedDatasets.formats.length,
        audiences: loadedDatasets.audiences.length,
        sites: loadedDatasets.sites.length
      });

      setDatasets(loadedDatasets);
      datasetsRef.current = loadedDatasets; // Also update ref for immediate access
      console.log('✅ [FAST-LOAD] Datasets state updated');
      
      // Load format inventory in background
      axios.get('/api/inventory/by-format')
        .then(inventoryRes => {
          if (inventoryRes.data.success && inventoryRes.data.formats) {
            const inventoryMap = {};
            inventoryRes.data.formats.forEach(fmt => {
              const formatKey = fmt.formatName.toLowerCase();
              inventoryMap[formatKey] = {
                avgMonthlyRequests: fmt.avgMonthlyRequests,
                avgMonthlyImpressions: fmt.avgMonthlyImpressions,
                byLanguage: fmt.byLanguage,
                byProperty: fmt.byProperty
              };
            });
            setFormatInventory(inventoryMap);
            console.log('✅ [FAST-LOAD] Format inventory loaded');
          }
        })
        .catch(invError => console.warn('⚠️ Format inventory skipped:', invError.message));
      }, 0); // End setTimeout - deferred processing
      
    } catch (error) {
      console.error('❌ Error loading datasets:', error);
      console.error('❌ Error details:', error.message, error.response?.status);
    }
  };

  const addMessage = (role, content, data = null) => {
    setMessages(prev => [...prev, {
      role,
      content,
      data,
      timestamp: new Date()
    }]);
  };

  // === VERTICAL PLAYBOOK INTEGRATION ===
  // Helper: Find vertical key from user input
  const findVerticalFromText = (text) => {
    const lower = text.toLowerCase();
    const playbooks = verticalPlaybook.vertical_playbook;
    
    // Check each vertical's aliases for matches
    for (const [key, config] of Object.entries(playbooks)) {
      if (config.aliases && Array.isArray(config.aliases)) {
        for (const alias of config.aliases) {
          if (lower.includes(alias.toLowerCase().replace(/_/g, ' '))) {
            console.log(`[TARGET] Matched vertical: ${config.label} (key: ${key})`);
            return key;
          }
        }
      }
    }
    return null;
  };

  // Helper: Get vertical config by key or industry name
  const getVerticalConfig = (verticalKeyOrIndustry) => {
    if (!verticalKeyOrIndustry) return null;
    
    const playbooks = verticalPlaybook.vertical_playbook;
    
    // Direct key match
    if (playbooks[verticalKeyOrIndustry]) {
      return playbooks[verticalKeyOrIndustry];
    }
    
    // Match by label (e.g., "Automotive" matches automotive_ice)
    for (const [key, config] of Object.entries(playbooks)) {
      if (config.label.toLowerCase().includes(verticalKeyOrIndustry.toLowerCase())) {
        return config;
      }
    }
    
    return null;
  };

  // Helper: Map objective to funnel stage
  const getFunnelStage = (objective) => {
    const mapping = {
      'Awareness': 'awareness',
      'VideoView': 'awareness',
      'Consideration': 'consideration',
      'Engagement': 'consideration',
      'Traffic': 'conversion',
      'LeadGen': 'conversion',
      'Conversion': 'conversion'
    };
    return mapping[objective] || 'awareness';
  };

  // === NUANCE & CONTEXT DETECTION ===
  // Helper: Detect product attributes and cultural context
  const detectProductContext = (text) => {
    const lower = text.toLowerCase();
    const context = {
      attributes: [],
      cultural: null,
      seasonal: null,
      personas: [],
      premiumLevel: 'standard',
      languageContext: null
    };
    
    // Product Attributes
    if (lower.match(/halal|syariah|shariah|islamic/i)) {
      context.attributes.push('halal');
      context.cultural = 'malay';
      context.personas.push('Muslim Households', 'Malay (mass reach)', 'Family Dynamic');
    }
    if (lower.match(/vegan|plant-based|organic|natural|health|wellness/i)) {
      context.attributes.push('health');
      context.personas.push('Health + Wellness', 'Active Lifestyle Seekers', 'Young Working Adult');
    }
    if (lower.match(/premium|luxury|high-end|exclusive|prestige/i)) {
      context.attributes.push('premium');
      context.premiumLevel = 'premium';
      context.personas.push('T20', 'Luxury Seekers', 'Emerging Affluents', 'Corporate Visionaries');
    }
    if (lower.match(/new brand|startup|launch/i)) {
      context.attributes.push('new_brand');
    }
    if (lower.match(/e-?commerce|online store|webshop|marketplace/i)) {
      context.attributes.push('ecommerce');
      context.personas.push('Online Shoppers', 'Millennials', 'Gen Z');
    }
    
    // Seasonal/Festive Context
    if (lower.match(/chinese new year|cny|lunar new year|imlek|春节/i)) {
      context.seasonal = 'cny';
      context.cultural = 'chinese';
      context.personas = ['Entertainment', 'Family Dynamic', 'Foodies', 'Travel & Experience Seekers', 'Online Shoppers'];
    }
    if (lower.match(/raya|hari raya|eid|ramadan|lebaran|puasa/i)) {
      context.seasonal = 'raya';
      context.cultural = 'malay';
      context.personas = ['Muslim Households', 'Family Dynamic', 'Foodies', 'Fashion Icons'];
    }
    if (lower.match(/deepavali|diwali|festival of lights/i)) {
      context.seasonal = 'deepavali';
      context.cultural = 'indian';
      context.personas = ['Family Dynamic', 'Entertainment', 'Foodies'];
    }
    if (lower.match(/gawai|harvest festival/i)) {
      context.seasonal = 'gawai';
      context.cultural = 'sabah_sarawak';
      context.personas = ['Family Dynamic', 'Travel & Experience Seekers'];
    }
    if (lower.match(/valentine|valentine'?s?\s*day|v-?day/i)) {
      context.seasonal = 'valentines';
      context.personas = ['Romantic Comedy', 'Young Working Adult', 'Millennials', 'Gen Z'];
    }
    if (lower.match(/mother's day|mothering day/i)) {
      context.seasonal = 'mothers_day';
      context.personas = ['Family Dynamic', 'Young Working Adult', 'Young Family'];
    }
    if (lower.match(/festive|celebration|gifting|gift|hamper/i)) {
      if (!context.seasonal) {  // Only set if no specific seasonal context already set
        context.seasonal = 'festive_general';
      }
      if (!context.personas.includes('Family Dynamic')) {
        context.personas.push('Family Dynamic', 'Emerging Affluents');
      }
    }
    
    // Language Context
    if (lower.match(/mandarin|chinese language|华语|中文/i)) {
      context.languageContext = 'chinese';
    }
    if (lower.match(/malay language|bahasa|bm/i)) {
      context.languageContext = 'malay';
    }
    if (lower.match(/tamil|indian language/i)) {
      context.languageContext = 'tamil';
    }
    
    return context;
  };

  // Helper: Infer industry from product context (nuanced, not keyword-based)
  const inferIndustryFromContext = (text, productContext) => {
    const lower = text.toLowerCase();
    
    // F&B detection (nuanced)
    if (lower.match(/water|juice|drink|beverage|food|snack|chocolate|candy|milk|coffee|tea|restaurant|cafe/) || 
        productContext.attributes.includes('halal')) {
      return productContext.attributes.includes('halal') ? 'F&B (Halal)' : 'F&B';
    }
    
    // Beauty & Cosmetics (perfume, skincare, makeup)
    if (lower.match(/perfume|fragrance|cologne|skincare|makeup|cosmetics|lipstick|foundation|mascara|eyeshadow|beauty|facial|serum|moisturizer|cleanser/i)) {
      return 'Beauty & Cosmetics';
    }
    
    // FMCG/Retail products (paint, household, personal care)
    if (lower.match(/paint|colour|color|coating|laundry|detergent|soap|shampoo|toothpaste|tissue|toilet paper|household|cleaning|batteries|diapers/i)) {
      return 'FMCG';
    }
    
    // Banking & Financial Services (credit card, loans, insurance)
    if (lower.match(/bank|credit card|loan|insurance|invest|financ|saving|account|mortgage|deposit/i)) {
      return 'Banking';
    }
    
    // Health & Wellness
    if (productContext.attributes.includes('health')) {
      return 'Health & Wellness';
    }
    
    // Premium Retail
    if (productContext.attributes.includes('premium') && !lower.match(/car|property|bank/i)) {
      return 'Premium Retail';
    }
    
    // E-commerce
    if (productContext.attributes.includes('ecommerce')) {
      return 'E-commerce';
    }
    
    // Use playbook detection as fallback
    const verticalKey = findVerticalFromText(text);
    if (verticalKey) {
      const config = verticalPlaybook.vertical_playbook[verticalKey];
      return config.label;
    }
    
    // Final fallback: infer from product type
    if (lower.match(/fashion|clothing|apparel/i)) return 'Fashion Retail';
    if (lower.match(/tech|gadget|electronic/i)) return 'Consumer Electronics';
    
    return null; // Let main logic handle
  };

  // === ENTITY EXTRACTION ENGINE ===
  const extractEntities = (text, currentBrief) => {
    const lower = text.toLowerCase();
    const updates = {};
    const log = [];

    // === PRODUCT/BRAND EXTRACTION ===
    if (!currentBrief.product_brand) {
      // Look for product mentions - be specific to avoid false matches
      const productPatterns = [
        /(?:selling|sell|launch|promote|marketing)\s+([a-z\s]+?)(?:\s*,|\s+campaign|\s+product|\s+brand|\.|\s+don'?t)/i,
        /(?:for|of|our|the|new)\s+([a-z\s]+?)\s+(?:campaign|product|brand)/i,
        /^([a-z\s]+?)\s+(?:campaign|launch|promotion)/i
      ];
      
      for (const pattern of productPatterns) {
        const match = text.match(pattern);
        if (match && match[1].length > 2 && match[1].length < 30) {
          const product = match[1].trim();
          // Filter out budget-related false matches
          if (!product.match(/budget|fix|mind|money|cost|price/i)) {
            updates.product_brand = product;
            log.push(`Product: ${product}`);
            break;
          }
        }
      }
    }

    // === CAMPAIGN OBJECTIVE EXTRACTION (natural language understanding) ===
    if (!currentBrief.campaign_objective) {
      // Awareness
      if (lower.match(/awareness|launch|visibility|introduce|announce|branding|brand recall|reach|make noise|eyeballs|know about/i)) {
        updates.campaign_objective = 'Awareness';
        log.push('Objective: Awareness');
      }
      // Usage/Consideration/Trial
      else if (lower.match(/trial|try|usage|use|adopt|consider|interest|explore|test|sample|drive usage|product usage/i)) {
        updates.campaign_objective = 'Consideration';
        log.push('Objective: Consideration (trial/usage)');
      }
      // Traffic
      else if (lower.match(/traffic|visit|clicks?|website|online|ecomm|e-?commerce|drive to site|web traffic/i)) {
        updates.campaign_objective = 'Traffic';
        log.push('Objective: Traffic');
      }
      // Engagement
      else if (lower.match(/engagement|interact|play|participate|time spent|dwell|engage with/i)) {
        updates.campaign_objective = 'Engagement';
        log.push('Objective: Engagement');
      }
      // LeadGen (including test drives)
      else if (lower.match(/leads?|sign.?ups?|registration|form|enquir|generate lead|collect contact|conversion|book|reserve|test.?drive|appointment|demo|trial/i)) {
        updates.campaign_objective = 'LeadGen';
        log.push('Objective: Lead Generation');
        // Flag if it's automotive-specific
        if (lower.match(/test.?drive|test drive|booking|appointment/i)) {
          updates._isTestDrive = true;
          log.push('  → Test Drive / Appointment focus');
        }
      }
      // Sales (but NOT "selling [product]" which is just describing the product)
      else if (lower.match(/\b(sales|purchase|buy|order|revenue|transaction)\b/i) && !lower.match(/i'?m? selling|we'?re? selling|selling [a-z]/i)) {
        updates.campaign_objective = 'Traffic'; // Map sales to traffic (ecommerce)
        log.push('Objective: Drive Sales (traffic strategy)');
      }
      // VideoView
      else if (lower.match(/video view|watch|vtr|view rate|video completion/i)) {
        updates.campaign_objective = 'VideoView';
        log.push('Objective: Video Views');
      }
    }

    // === PRODUCT CONTEXT DETECTION (ALWAYS RUN) ===
    // Detect seasonal/cultural context on EVERY message, not just first
    const productContext = detectProductContext(text);
    console.log('🔍 Product context detected:', {
      seasonal: productContext.seasonal,
      cultural: productContext.cultural,
      attributes: productContext.attributes,
      personas: productContext.personas.slice(0, 3)
    });
    
    // Always store/update seasonal and cultural context if detected
    if (productContext.seasonal && !currentBrief._seasonalContext) {
      updates._seasonalContext = productContext.seasonal;
      updates.seasonalContext = productContext.seasonal;  // Also store without underscore
      log.push(`  → Seasonal: ${productContext.seasonal}`);
    }
    if (productContext.cultural && !currentBrief._culturalContext) {
      updates._culturalContext = productContext.cultural;
      updates.culturalContext = productContext.cultural;  // Also store without underscore
      log.push(`  → Cultural: ${productContext.cultural}`);
    }
    
    // === INDUSTRY CLASSIFICATION (CONTEXT-AWARE) ===
    if (!currentBrief.industry) {
      // Store full product context for industry inference
      updates._productContext = productContext;
      
      // Step 2: Use context-aware inference (nuanced)
      const inferredIndustry = inferIndustryFromContext(text, productContext);
      
      if (inferredIndustry) {
        updates.industry = inferredIndustry;
        log.push(`Industry: ${inferredIndustry} (Context-aware)`);
        
        // Store context-based personas if detected
        if (productContext.personas.length > 0) {
          updates._contextPersonas = productContext.personas;
          log.push(`  → Context personas: ${productContext.personas.slice(0, 3).join(', ')}`);
        }
      } else {
        // Fallback to playbook
        const verticalKey = findVerticalFromText(text);
        
        if (verticalKey) {
          const config = verticalPlaybook.vertical_playbook[verticalKey];
          updates.industry = config.label;
          updates._vertical_key = verticalKey;
          log.push(`Industry: ${config.label} (Playbook: ${verticalKey})`);
        }
      }
    }

    // === BUDGET EXTRACTION ===
    if (!currentBrief.budget_rm) {
      // Direct amounts: "RM 100k", "150000", "budget is 80k", standalone "350K"
      // Try multiple patterns in order of specificity
      let budgetMatch = text.match(/rm\s*([\d,]+)k?|budget.*?([\d,]+)k?|([\d,]+)k?\s*(?:ringgit|thousand)/i);
      
      // If no match yet, try standalone number with K (like "350K")
      if (!budgetMatch) {
        budgetMatch = text.match(/\b([\d,]+)k\b/i);
      }
      
      // If still no match, try plain numbers (like "150000")
      if (!budgetMatch) {
        budgetMatch = text.match(/\b([\d,]{4,})\b/);
      }
      
      if (budgetMatch) {
        let amount = budgetMatch[1] || budgetMatch[2] || budgetMatch[3];
        amount = amount.replace(/,/g, '');
        
        // Multiply by 1000 if 'k' is present and number doesn't already have thousands
        if (text.toLowerCase().includes('k') && !text.toLowerCase().includes('000')) {
          amount = parseFloat(amount) * 1000;
        }
        
        updates.budget_rm = parseFloat(amount);
        log.push(`Budget: RM ${parseFloat(amount).toLocaleString()}`);
      }
      // Qualitative: "small budget", "limited budget"
      else if (lower.match(/small budget|limited budget|tight budget|low budget/i)) {
        updates.budget_rm = 50000; // Assume RM50k for "small"
        updates._budgetQualifier = 'small';
        log.push('Budget: Small (~RM50k assumed)');
      }
      // "Big budget", "large budget"
      else if (lower.match(/big budget|large budget|high budget|premium budget/i)) {
        updates.budget_rm = 200000; // Assume RM200k for "big"
        updates._budgetQualifier = 'large';
        log.push('Budget: Large (~RM200k assumed)');
      }
      // "Medium budget"
      else if (lower.match(/medium budget|moderate budget|average budget/i)) {
        updates.budget_rm = 100000; // Assume RM100k
        updates._budgetQualifier = 'medium';
        log.push('Budget: Medium (~RM100k assumed)');
      }
      // "Not sure", "don't know", "no budget yet", "propose", "suggest"
      else if (lower.match(/not sure|don't know|no budget|unsure|don'?t have.*budget|no fix.*budget|haven'?t.*budget|budget.*mind|propose|suggest|recommend budget|what budget|how much|please.*propose|you.*propose|you.*suggest|you.*recommend/i)) {
        updates._needsBudgetSuggestion = true;
        log.push('Budget: User needs suggestion');
      }
    }

    // === GEOGRAPHY EXTRACTION ===
    if (currentBrief.geography.length === 0) {
      const states = ['johor', 'kedah', 'kelantan', 'melaka', 'malacca', 'negeri sembilan', 
        'pahang', 'penang', 'pulau pinang', 'perak', 'perlis', 'sabah', 'sarawak', 'selangor', 
        'terengganu', 'kuala lumpur', 'putrajaya', 'labuan']; // Removed 'kl' - too broad, using word boundary instead
      
      const foundStates = [];
      
      // Special case: Match 'KL' with word boundaries to avoid false positives
      if (lower.match(/\bkl\b/i)) {
        foundStates.push('Kuala Lumpur');
      }
      
      states.forEach(state => {
        if (lower.includes(state)) {
          if (state === 'pulau pinang') foundStates.push('Penang');
          else if (state === 'malacca') foundStates.push('Melaka');
          else if (state === 'kuala lumpur') foundStates.push('Kuala Lumpur');
          else foundStates.push(state.charAt(0).toUpperCase() + state.slice(1));
        }
      });
      
      // === REGIONAL GEOGRAPHY KEYWORDS (KULT Geography Mapping Table) ===
      
      // Nationwide
      if (lower.match(/nationwide|national|all\s+states|whole\s+malaysia|across\s+malaysia|entire\s+country/i)) {
        foundStates.push('Malaysia');
        log.push('Geography: Nationwide (Malaysia)');
      }
      
      // Northern Region: Penang, Kedah, Perlis, Perak
      if (lower.match(/\bnorth(ern)?\b|utara|penang\s+region/i)) {
        foundStates.push('Penang', 'Kedah', 'Perlis', 'Perak');
        log.push('Geography: Northern Region (Penang, Kedah, Perlis, Perak)');
      }
      
      // Southern Region: Johor, Melaka, Negeri Sembilan
      if (lower.match(/\bsouth(ern)?\b|jb\s+region|singapore\s+belt/i)) {
        foundStates.push('Johor', 'Melaka', 'Negeri Sembilan');
        log.push('Geography: Southern Region (Johor, Melaka, Negeri Sembilan)');
      }
      
      // East Coast Region: Kelantan, Terengganu, Pahang
      if (lower.match(/east\s+coast|eastern\s+coast|pantai\s+timur|muslim\s+heartland/i)) {
        foundStates.push('Kelantan', 'Terengganu', 'Pahang');
        log.push('Geography: East Coast (Kelantan, Terengganu, Pahang)');
      }
      
      // East Malaysia: Sabah, Sarawak, Labuan
      if (lower.match(/east\s+malaysia|borneo|malaysia\s+timur|east\s+side|sabah|sarawak/i)) {
        foundStates.push('Sabah', 'Sarawak', 'Labuan');
        log.push('Geography: East Malaysia (Sabah, Sarawak, Labuan)');
      }
      
      // Central Region / Klang Valley: KL, Selangor, Putrajaya
      if (lower.match(/central|klang\s+valley|greater\s+kl|urban\s+malaysia/i)) {
        foundStates.push('Kuala Lumpur', 'Selangor', 'Putrajaya');
        log.push('Geography: Central Region (KL, Selangor, Putrajaya)');
      }
      
      // Peninsular Malaysia: All Peninsula states
      if (lower.match(/peninsula|west\s+malaysia|semenanjung|mainland\s+malaysia/i)) {
        foundStates.push('Kuala Lumpur', 'Selangor', 'Putrajaya', 'Johor', 'Melaka', 
                        'Negeri Sembilan', 'Penang', 'Kedah', 'Perlis', 'Perak', 
                        'Kelantan', 'Terengganu', 'Pahang');
        log.push('Geography: Peninsular Malaysia (13 states)');
      }
      
      if (foundStates.length > 0) {
        updates.geography = [...new Set(foundStates)];
      }
    }

    // === DEVICE EXTRACTION ===
    if (currentBrief.devices.length === 0) {
      const devices = [];
      if (lower.match(/tv|ctv|connected tv|smart tv|big screen|ott|streaming tv/i)) devices.push('CTV');
      if (lower.match(/mobile|phone|smartphone|app|in-app|on the go/i)) devices.push('Mobile');
      if (lower.match(/desktop|computer|laptop|pc|office|work/i)) devices.push('Desktop');
      
      if (devices.length > 0) {
        updates.devices = devices;
        log.push(`Devices: ${devices.join(', ')}`);
      }
    }

    // === AUDIENCE EXTRACTION ===
    if (!currentBrief.audience && lower.match(/audience|target|people|consumers|customers|segment/i)) {
      // Extract audience descriptors
      if (lower.match(/young|youth|millennial|gen z|18-35|students/i)) {
        updates.audience = 'Young Adults (18-35)';
        log.push('Audience: Young Adults');
      }
      else if (lower.match(/professional|working|office|executive|business/i)) {
        updates.audience = 'Professionals';
        log.push('Audience: Professionals');
      }
      else if (lower.match(/family|parents|household|married/i)) {
        updates.audience = 'Families/Parents';
        log.push('Audience: Families');
      }
      else if (lower.match(/women|female|ladies|moms/i)) {
        updates.audience = 'Women';
        log.push('Audience: Women');
      }
      else if (lower.match(/men|male|guys|dads/i)) {
        updates.audience = 'Men';
        log.push('Audience: Men');
      }
    }

    // === DURATION EXTRACTION ===
    // ONLY extract if we've already asked the duration question (to avoid skipping the question)
    const askedDurationInExtraction = currentBrief._meta?.clarificationsAsked?.duration;
    if (!currentBrief.duration_weeks && askedDurationInExtraction) {
      // Support decimal numbers like "1.5 months"
      const durationMatch = text.match(/(\d+\.?\d*)\s*(week|wk|month|mth)/i);
      if (durationMatch) {
        const num = parseFloat(durationMatch[1]); // Use parseFloat for decimal support
        const unit = durationMatch[2].toLowerCase();
        updates.duration_weeks = unit.includes('month') || unit.includes('mth') ? Math.round(num * 4) : Math.round(num);
        log.push(`Duration: ${updates.duration_weeks} weeks`);
      }
    }

    // === BUYING TYPE INFERENCE ===
    if (!currentBrief.buying_type) {
      if (lower.match(/premium|homepage|takeover|sponsorship|guaranteed|direct/i)) {
        updates.buying_type = 'Direct';
        log.push('Buy Type: Direct (premium)');
      }
      else if (lower.match(/programmatic guaranteed|pg|private marketplace|pmp/i)) {
        updates.buying_type = 'PG';
        log.push('Buy Type: PG');
      }
      else if (lower.match(/programmatic|pd|open auction|rtb/i)) {
        updates.buying_type = 'PD';
        log.push('Buy Type: PD');
      }
    }

    // === PRIORITY INFERENCE ===
    if (!currentBrief.priority) {
      if (lower.match(/max reach|maximum reach|scale|mass|volume|many people|wide reach/i)) {
        updates.priority = 'Max Reach';
        log.push('Priority: Max Reach');
      }
      else if (lower.match(/performance|efficiency|roi|conversion|results|quality|targeted/i)) {
        updates.priority = 'Performance';
        log.push('Priority: Performance');
      }
      else if (lower.match(/cost.?effective|cheap|low.?cpm|value|affordable|efficient/i)) {
        updates.priority = 'Max Reach'; // Cost-effective = reach strategy
        log.push('Priority: Cost-Effective (Max Reach)');
      }
    }

    // Store extraction log
    if (log.length > 0) {
      updates._extractionLog = [...(currentBrief._extractionLog || []), ...log];
    }

    return updates;
  };

  // === SMART DEFAULTS (fill reasonable gaps) ===
  const applySmartDefaults = (briefToUse = null) => {
    const currentBrief = briefToUse || brief;
    const defaults = {};
    
    if (!currentBrief.geography || currentBrief.geography.length === 0) {
      defaults.geography = ['Malaysia']; // Default nationwide (not KL only)
    }
    
    if (!currentBrief.devices || currentBrief.devices.length === 0) {
      // Default based on objective and industry
      if (currentBrief.campaign_objective === 'VideoView' && currentBrief.budget_rm > 100000) {
        defaults.devices = ['CTV', 'Mobile', 'Desktop'];
      } else if (currentBrief.industry === 'FMCG' || currentBrief.industry === 'Retail') {
        defaults.devices = ['Mobile', 'Desktop']; // Mobile-first
      } else if (currentBrief.industry === 'Banking' || currentBrief.industry === 'Property') {
        defaults.devices = ['Desktop', 'Mobile']; // Desktop priority
      } else {
        defaults.devices = ['Mobile', 'Desktop'];
      }
    }
    
    if (!currentBrief.buying_type) {
      defaults.buying_type = 'Mixed';
    }
    
    if (!currentBrief.priority) {
      if (currentBrief.campaign_objective === 'Awareness' || currentBrief.campaign_objective === 'VideoView') {
        defaults.priority = 'Max Reach';
      } else if (currentBrief.campaign_objective === 'LeadGen' || currentBrief.campaign_objective === 'Traffic') {
        defaults.priority = 'Performance';
      } else {
        defaults.priority = 'Balanced';
      }
    }

    if (!currentBrief.duration_weeks) {
      defaults.duration_weeks = 4; // Standard 4 weeks
    }
    
    return { ...currentBrief, ...defaults };
  };

  // === SMART BUDGET SUGGESTION ===
  const suggestBudget = (briefData) => {
    const { campaign_objective, industry, geography, duration_weeks, _seasonalContext, _culturalContext } = briefData;
    
    // Base budget by objective
    let baseBudget = 80000; // Default
    
    if (campaign_objective === 'Awareness' || campaign_objective === 'VideoView') {
      baseBudget = 120000; // Awareness needs scale
    } else if (campaign_objective === 'LeadGen') {
      baseBudget = 100000; // Lead gen needs quality
    } else if (campaign_objective === 'Traffic' || campaign_objective === 'Engagement') {
      baseBudget = 70000; // Performance campaigns can be efficient
    } else if (campaign_objective === 'Consideration') {
      baseBudget = 90000; // Mid-funnel
    }
    
    // === SEASONAL/CULTURAL BUDGET OVERRIDE ===
    // Festive campaigns require premium placements and higher CPMs
    let seasonalMultiplier = 1.0;
    if (_seasonalContext || _culturalContext) {
      console.log('🎊 SEASONAL BUDGET ADJUSTMENT: Applying festive premium');
      seasonalMultiplier = 1.3; // 30% increase for festive campaigns (premium placements, higher competition)
      
      // Major festive seasons get even higher multiplier
      if (['cny', 'raya', 'deepavali'].includes(_seasonalContext)) {
        seasonalMultiplier = 1.5; // 50% increase for major festivals
        console.log(`   Major festival (${_seasonalContext}): 1.5x multiplier`);
      }
    }
    
    // Industry multiplier
    let industryMultiplier = 1.0;
    if (industry === 'Automotive' || industry === 'Property') {
      industryMultiplier = 1.5; // High-value industries need more budget
    } else if (industry === 'Banking') {
      industryMultiplier = 1.3; // Financial services premium
    } else if (industry === 'FMCG' || industry === 'Retail') {
      industryMultiplier = 0.9; // Mass market can be efficient
    }
    
    // Geography multiplier
    let geoMultiplier = 1.0;
    if (geography && geography.length > 0) {
      if (geography.includes('Nationwide')) {
        geoMultiplier = 2.0; // Nationwide = 2x budget
      } else if (geography.length > 3) {
        geoMultiplier = 1.5; // Multiple states
      } else if (geography.includes('Selangor') && geography.includes('Kuala Lumpur')) {
        geoMultiplier = 1.0; // Klang Valley = base
      }
    }
    
    // Duration multiplier
    let durationMultiplier = 1.0;
    if (duration_weeks) {
      if (duration_weeks <= 2) {
        durationMultiplier = 0.7; // Short burst
      } else if (duration_weeks >= 8) {
        durationMultiplier = 1.5; // Extended campaign
      }
    }
    
    // Calculate suggested budget WITH SEASONAL ADJUSTMENT
    const suggested = Math.round((baseBudget * industryMultiplier * geoMultiplier * durationMultiplier * seasonalMultiplier) / 10000) * 10000;
    
    // Provide range
    const low = Math.round(suggested * 0.7 / 10000) * 10000;
    const high = Math.round(suggested * 1.3 / 10000) * 10000;
    
    return {
      suggested,
      low,
      high,
      reasoning: {
        objective: campaign_objective,
        industry,
        geography: geography && geography.length > 0 ? geography.join(', ') : 'Klang Valley',
        duration: duration_weeks || 4,
        seasonal: _seasonalContext || _culturalContext ? `${_seasonalContext || _culturalContext} (${seasonalMultiplier}x)` : null
      }
    };
  };

  // === CHECK IF READY TO GENERATE PLAN ===
  const isReadyToGenerate = () => {
    return brief.campaign_objective && brief.industry && brief.budget_rm;
  };

  // === WHAT'S MISSING? (for smart follow-up) ===
  const getMissingCriticalInfo = () => {
    const missing = [];
    if (!brief.campaign_objective) missing.push('objective');
    if (!brief.industry) missing.push('industry');
    if (!brief.budget_rm) missing.push('budget');
    return missing;
  };

  // === NEW: VALIDATE CONTEXT BEFORE PLANNING (Package 3) ===
  const validateContextComplete = (briefToCheck) => {
    const missingContext = [];
    
    // Check critical context fields
    if (!briefToCheck.creative_assets) {
      missingContext.push({
        field: 'creative_assets',
        question: 'What creative assets do you have or plan to create? (video / static banners / both / none yet)'
      });
    }
    
    if (!briefToCheck.duration_weeks) {
      missingContext.push({
        field: 'duration',
        question: 'How long should this campaign run? (e.g., 2 weeks / 4 weeks / 8 weeks)'
      });
    }
    
    if (!briefToCheck.geography_specificity && (!briefToCheck.geography || briefToCheck.geography.length === 0)) {
      missingContext.push({
        field: 'geography_specificity',
        question: 'What is your geographic focus? (nationwide / Klang Valley + major cities / specific regions)'
      });
    }
    
    if (!briefToCheck.buying_preference) {
      missingContext.push({
        field: 'buying_preference',
        question: 'Do you prefer direct deals, programmatic buying, or a mix of both?'
      });
    }
    
    return missingContext;
  };

  // === GENERATE MEDIA PLAN (dataset-only) ===
  const generateMediaPlan = (briefToUse = null) => {
    // Use ref to get fresh datasets (avoid closure)
    const currentDatasets = datasetsRef.current;
    
    // Guard: Check if datasets are loaded
    if (!currentDatasets.rates.length || !currentDatasets.formats.length) {
      console.error('❌ Datasets not loaded yet', {
        rates: currentDatasets.rates.length,
        formats: currentDatasets.formats.length
      });
      return null;
    }

    // Use provided brief or fall back to component state
    const currentBrief = briefToUse || brief;
    console.log('📋 Using brief for plan generation:', currentBrief);
    
    const fullBrief = applySmartDefaults(currentBrief);
    const { campaign_objective, industry, budget_rm, devices, buying_type, priority, geography, duration_weeks, audience } = fullBrief;

    // === EARLY BUDGET TIER DETERMINATION (USING NEW HELPER) ===
    // Determine budget tier FIRST so all subsequent steps can use it
    const { tier: budgetTier, strategy: tierStrategy } = determineBudgetTier(budget_rm);
    
    console.log(`[BUDGET] BUDGET TIER DETERMINED: ${budgetTier.toUpperCase()} (${tierStrategy.name})`);
    console.log(`   Budget: RM ${budget_rm.toLocaleString()}`);
    console.log(`   Max Platforms: ${tierStrategy.maxPlatforms}`);
    console.log(`   Audience Limit: ${tierStrategy.audienceLimit}`);
    console.log(`   Buying Types: ${tierStrategy.buyingTypes.join(', ')}`);
    
    // === NEW: CALCULATE PERSONA RATIO FOR INVENTORY FILTERING ===
    const personaRatio = calculatePersonaRatio(
      fullBrief.selectedPersonas || [],
      currentDatasets.audiences,
      fullBrief.massTargeting || false
    );

    // 1. SELECT FORMATS - VERTICAL PLAYBOOK: Funnel-based selection with robust lookup
    console.log('[TARGET] PLAYBOOK Format selection - Objective:', campaign_objective, '| Industry:', industry);
    let selectedFormats = [];
    
    // === IMPROVED: Robust playbook lookup with explicit fallback ===
    const industryKey = currentBrief._vertical_key || normalizeIndustryKey(industry);
    const playbookResult = getIndustryPlaybook(industryKey, verticalPlaybook) || getGenericPlaybook();
    
    const verticalConfig = playbookResult.config;
    const playbookSource = playbookResult.source;
    const playbookLabel = playbookResult.label;
    
    console.log(`📖 PLAYBOOK SOURCE: ${playbookSource.toUpperCase()}`);
    console.log(`   Industry Key: ${industryKey} → Playbook: ${playbookLabel}`);
    
    if (verticalConfig) {
      console.log(`   Strategy DNA: ${verticalConfig.strategy_dna}`);
      
      // Get funnel stage based on objective
      const funnelStage = getFunnelStage(campaign_objective);
      console.log(`   Funnel stage: ${funnelStage} (from ${campaign_objective})`);
      
      // Get recommended format keywords from playbook
      const playbookFormats = verticalConfig.funnel[funnelStage] || [];
      const bestFormats = verticalConfig.creative_requirements?.best_formats || [];
      const allRecommended = [...playbookFormats, ...bestFormats];
      
      console.log(`   Playbook recommends:`, allRecommended);
      
      // Match available formats to playbook recommendations
      selectedFormats = currentDatasets.formats.filter(f => {
        const name = (f.name || f['Ad format'] || '').toLowerCase();
        const goal = (f.goal || '').toLowerCase();
        
        // Check if format name or goal matches any playbook recommendation
        return allRecommended.some(rec => {
          const recLower = rec.toLowerCase().replace(/_/g, ' ');
          // Flexible matching: "OTT_video" matches "OTT", "video", "streaming", etc.
          const keywords = recLower.split(/[\s_]+/);
          return keywords.some(keyword => 
            name.includes(keyword) || goal.includes(keyword)
          );
        });
      });
      
      // If no exact match, use format type hints from funnel stage
      if (selectedFormats.length < 3) {
        console.log('   ⚠️ Limited matches, applying format type rules');
        // awareness -> video/OTT, consideration -> rich media/interactive, conversion -> display/native
        if (funnelStage === 'awareness') {
          const videoFormats = currentDatasets.formats.filter(f => {
            const name = (f.name || f['Ad format'] || '').toLowerCase();
            return name.match(/video|stream|ott|ctv/i);
          });
          selectedFormats.push(...videoFormats);
        } else if (funnelStage === 'consideration') {
          const interactiveFormats = currentDatasets.formats.filter(f => {
            const name = (f.name || f['Ad format'] || '').toLowerCase();
            return name.match(/rich|interactive|carousel|calculator|collector/i);
          });
          selectedFormats.push(...interactiveFormats);
        } else {
          const conversionFormats = currentDatasets.formats.filter(f => {
            const name = (f.name || f['Ad format'] || '').toLowerCase();
            return name.match(/display|banner|native|retarget|lead/i);
          });
          selectedFormats.push(...conversionFormats);
        }
        // Remove duplicates
        selectedFormats = [...new Map(selectedFormats.map(f => [f.id || f.name, f])).values()];
      }
      
      console.log(`   ✅ Selected ${selectedFormats.length} formats from playbook`);
    } else {
      // Fallback: No playbook - use generic objective-based selection
      console.log('⚠️ No playbook found, using generic selection');
      selectedFormats = currentDatasets.formats.filter(f => {
        const goal = (f.goal || '').toLowerCase();
        return goal.includes(campaign_objective.toLowerCase());
      });
    }

    // === SEASONAL/CULTURAL OVERRIDE: Replace standard formats ===
    const seasonalContext = currentBrief._seasonalContext;
    const culturalContext = currentBrief._culturalContext;
    
    if (seasonalContext || culturalContext) {
      console.log('🎊 SEASONAL/CULTURAL OVERRIDE: Replacing standard formats with festive-optimized selection');
      console.log(`   Seasonal: ${seasonalContext}, Cultural: ${culturalContext}`);
      
      // Priority formats for seasonal/festive campaigns
      const festiveFormatKeywords = [
        'video', 'ott', 'ctv', 'streaming', // Video priority for emotional storytelling
        'hero', 'billboard', 'takeover', // High-impact placements for visibility
        'carousel', 'interactive', 'rich media', // Engaging product showcases
        'native', 'branded content', 'editorial', // Vernacular content integration
        'social' // Social sharing moments
      ];
      
      // Filter formats based on festive priorities
      const festiveFormats = currentDatasets.formats.filter(f => {
        const name = (f.name || f['Ad format'] || '').toLowerCase();
        const goal = (f.goal || '').toLowerCase();
        return festiveFormatKeywords.some(keyword => name.includes(keyword) || goal.includes(keyword));
      });
      
      if (festiveFormats.length >= 4) {
        selectedFormats = festiveFormats;
        console.log(`   ✅ Replaced with ${festiveFormats.length} festive-optimized formats`);
      } else {
        // Mix festive with best available
        selectedFormats = [...festiveFormats, ...selectedFormats.filter(f => !festiveFormats.includes(f))];
        console.log(`   ⚠️ Limited festive formats (${festiveFormats.length}), mixed with standard`);
      }
    }
    
    // === CHANNEL PREFERENCE FILTER ===
    // If user specified a channel preference, prioritize formats from that channel
    const channelPref = fullBrief.channel_preference;
    if (channelPref && channelPref !== 'Balanced') {
      console.log(`📺 Channel preference: ${channelPref} - Filtering formats`);
      
      let channelFormats = [];
      
      if (channelPref === 'OTT') {
        // OTT/Streaming: Video formats on streaming platforms
        channelFormats = selectedFormats.filter(f => {
          const name = (f.name || f['Ad format'] || '').toLowerCase();
          return name.match(/stream|video|ott|ctv|youtube|viu|iflix|astro/i);
        });
        console.log(`   Found ${channelFormats.length} OTT/Streaming formats`);
      } else if (channelPref === 'Social') {
        // Social: Facebook, Instagram, TikTok formats
        channelFormats = selectedFormats.filter(f => {
          const name = (f.name || f['Ad format'] || '').toLowerCase();
          const platform = (f.platform || '').toLowerCase();
          return name.match(/social|facebook|instagram|tiktok|meta|feed|story|reel/i) ||
                 platform.match(/social|facebook|instagram|tiktok|meta/i);
        });
        console.log(`   Found ${channelFormats.length} Social Media formats`);
      } else if (channelPref === 'Display') {
        // Display: Banner, native, programmatic formats
        channelFormats = selectedFormats.filter(f => {
          const name = (f.name || f['Ad format'] || '').toLowerCase();
          return name.match(/display|banner|native|leaderboard|mrec|skyscraper|programmatic/i);
        });
        console.log(`   Found ${channelFormats.length} Display formats`);
      }
      
      // If we found enough channel-specific formats, prioritize them
      if (channelFormats.length >= 3) {
        selectedFormats = channelFormats;
        console.log(`   ✅ Prioritizing ${channelPref} formats`);
      } else {
        // Mix channel-specific with others to ensure we have enough variety
        const otherFormats = selectedFormats.filter(f => !channelFormats.includes(f));
        selectedFormats = [...channelFormats, ...otherFormats];
        console.log(`   ⚠️ Limited ${channelPref} formats, mixing with others`);
      }
    }
    
    // Limit to 4-6 formats (playbook best practice)
    selectedFormats = selectedFormats.slice(0, Math.min(6, Math.max(4, selectedFormats.length)));
    
    // Fallback if still no formats
    if (selectedFormats.length === 0) {
      console.log('⚠️ No match - using top formats as fallback');
      selectedFormats = currentDatasets.formats.slice(0, 5);
    }
    
    // === NEW: VALIDATE INVENTORY CAPACITY ===
    console.log('🔍 Validating inventory capacity...');
    const inventoryValidation = validateInventoryCapacity(
      budget_rm,
      selectedFormats,
      formatInventory,
      fullBrief.targetLanguages || [],
      personaRatio
    );
    
    if (!inventoryValidation.valid) {
      console.warn('⚠️ INVENTORY WARNING:', inventoryValidation.message);
    } else if (inventoryValidation.severity) {
      console.log(`ℹ️ Inventory notice (${inventoryValidation.severity}):`, inventoryValidation.message);
    }
    
    // Log final selection for verification
    console.log(`✅ PLAYBOOK APPLIED: ${playbookLabel} (source: ${playbookSource})`);
    console.log(`   Objective: ${campaign_objective} → Funnel: ${getFunnelStage(campaign_objective)}`);
    console.log(`   Selected ${selectedFormats.length} formats:`, selectedFormats.map(f => f.name || f['Ad format']).join(', '));
    
    // Warning if using generic fallback
    if (playbookSource === 'generic') {
      console.log(`   ⚠️ WARNING: Using generic fallback - no industry-specific playbook found for ${industry}`);
    }

    // 2. SELECT RATES
    let candidateRates = currentDatasets.rates
      .filter(r => {
        const rateDevices = (r.Devices || '').toLowerCase();
        return devices.some(d => rateDevices.includes(d.toLowerCase()));
      })
      .map(r => {
        let cpm = 999;
        let actualBuyType = buying_type;

        if (buying_type === 'Direct') {
          cpm = parseFloat(r['CPM Direct (RM)']) || 999;
        } else if (buying_type === 'PG') {
          cpm = parseFloat(r['CPM PG (RM)']) || parseFloat(r['CPM Direct (RM)']) || 999;
        } else if (buying_type === 'PD') {
          cpm = parseFloat(r['CPM PD (RM)']) || parseFloat(r['CPM PG (RM)']) || parseFloat(r['CPM Direct (RM)']) || 999;
        } else {
          const pdCpm = parseFloat(r['CPM PD (RM)']) || 999;
          const pgCpm = parseFloat(r['CPM PG (RM)']) || 999;
          const directCpm = parseFloat(r['CPM Direct (RM)']) || 999;
          cpm = Math.min(pdCpm, pgCpm, directCpm);

          if (cpm === pdCpm && pdCpm < 999) actualBuyType = 'PD';
          else if (cpm === pgCpm && pgCpm < 999) actualBuyType = 'PG';
          else if (cpm === directCpm && directCpm < 999) actualBuyType = 'Direct';
        }

        return { ...r, selectedCPM: cpm, actualBuyType };
      })
      .filter(r => r.selectedCPM < 999);

    if (candidateRates.length === 0) {
      candidateRates = currentDatasets.rates
        .map(r => {
          const pdCpm = parseFloat(r['CPM PD (RM)']) || 999;
          const pgCpm = parseFloat(r['CPM PG (RM)']) || 999;
          const directCpm = parseFloat(r['CPM Direct (RM)']) || 999;
          const cpm = Math.min(pdCpm, pgCpm, directCpm);
          
          let actualBuyType = 'Mixed';
          if (cpm === pdCpm && pdCpm < 999) actualBuyType = 'PD';
          else if (cpm === pgCpm && pgCpm < 999) actualBuyType = 'PG';
          else if (cpm === directCpm && directCpm < 999) actualBuyType = 'Direct';

          return { ...r, selectedCPM: cpm, actualBuyType };
        })
        .filter(r => r.selectedCPM < 999);
    }

    candidateRates.sort((a, b) => {
      if (priority === 'Max Reach') return a.selectedCPM - b.selectedCPM;
      if (priority === 'Performance') return b.selectedCPM - a.selectedCPM;
      return 0;
    });

    const selectedRates = candidateRates.slice(0, 6);

    // === NEW: APPLY INTELLIGENT SCORING TO FORMATS ===
    console.log('[TARGET] Applying intelligent format scoring...');
    const scoredFormats = scoreFormats(selectedFormats, {
      campaign_objective,
      industry,
      budget_rm,
      devices: fullBrief.devices || [],
      creative_asset_type: fullBrief.creative_asset_type
    });
    
    // Enrich with performance benchmarks
    const enrichedFormats = enrichWithBenchmarks(scoredFormats, {
      campaign_objective,
      industry
    });
    
    // Use top scored formats
    selectedFormats = enrichedFormats.slice(0, Math.min(6, enrichedFormats.length));
    console.log(`✅ Scored formats - Top format: ${selectedFormats[0]?.name} (${selectedFormats[0]?.confidence}% confidence)`);

    // 3. SELECT AUDIENCES - CONTEXT-AWARE PERSONA MAPPING
    console.log('👥 Total audiences available:', currentDatasets.audiences.length);
    
    let selectedAudiences = [];
    
    // PRIORITY 1: Use context personas if available (seasonal/cultural/product attributes)
    const contextPersonas = currentBrief._contextPersonas || [];
    // seasonalContext and culturalContext already declared earlier in function scope
    
    if (contextPersonas.length > 0 || seasonalContext || culturalContext) {
      console.log('[TARGET] CONTEXT-AWARE: Using product/seasonal/cultural personas');
      console.log(`   Context personas:`, contextPersonas);
      if (seasonalContext) console.log(`   Seasonal: ${seasonalContext}`);
      if (culturalContext) console.log(`   Cultural: ${culturalContext}`);
      
      // Match context personas
      const contextAudiences = currentDatasets.audiences.filter(a => {
        const persona = (a.persona || a.name || '').toLowerCase();
        return contextPersonas.some(p => {
          const pLower = p.toLowerCase();
          const keywords = pLower.split(/\s+/);
          return keywords.some(keyword => persona.includes(keyword)) || persona.includes(pLower);
        });
      });
      
      selectedAudiences = contextAudiences.sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0)).slice(0, tierStrategy.audienceLimit);
      
      console.log(`✅ Context-matched audiences: ${selectedAudiences.length} (limit: ${tierStrategy.audienceLimit})`);
      
      // If still need more audiences, fill with complementary personas
      if (selectedAudiences.length < tierStrategy.audienceLimit) {
        const remaining = currentDatasets.audiences
          .filter(a => !selectedAudiences.includes(a))
          .sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0));
        selectedAudiences.push(...remaining.slice(0, tierStrategy.audienceLimit - selectedAudiences.length));
      }
    }
    // PRIORITY 2: Use vertical-specific persona mapping (with improved strategic selection)
    else {
      const audienceVerticalKey = currentBrief._vertical_key || normalizeIndustryKey(industry);
      const personaMapping = playbookResult.personas; // Use personas from playbook result
      
      if (personaMapping && personaMapping.primary_personas && personaMapping.primary_personas.length > 0) {
        console.log(`📖 Using persona mapping for ${audienceVerticalKey} (${playbookSource} playbook)`);
        console.log(`   Primary personas:`, personaMapping.primary_personas);
        
        // Priority 1: Match primary personas (exact or partial match)
        const primaryAudiences = currentDatasets.audiences.filter(a => {
          const persona = (a.persona || a.name || '').toLowerCase();
          
          // === APPLY PERSONA CONSTRAINTS ===
          // Blacklist check: exclude if blacklisted
          if (personaConstraints.blacklist.some(bl => persona.includes(bl.toLowerCase()) || bl.toLowerCase().includes(persona.split(' ')[0]))) {
            console.log('[PERSONA] Filtered out blacklisted:', persona);
            return false;
          }
          
          return personaMapping.primary_personas.some(p => {
            const pLower = p.toLowerCase();
            // Flexible matching: "Young Working Adult" matches "young", "working", "adult"
            const keywords = pLower.split(/\s+/);
            return keywords.some(keyword => persona.includes(keyword)) || persona.includes(pLower);
          });
        });
        
        // Priority 2: Match secondary personas
        const secondaryAudiences = currentDatasets.audiences.filter(a => {
          const persona = (a.persona || a.name || '').toLowerCase();
          
          // === APPLY PERSONA CONSTRAINTS ===
          // Blacklist check
          if (personaConstraints.blacklist.some(bl => persona.includes(bl.toLowerCase()) || bl.toLowerCase().includes(persona.split(' ')[0]))) {
            console.log('[PERSONA] Filtered out blacklisted:', persona);
            return false;
          }
          
          return personaMapping.secondary_personas.some(p => {
            const pLower = p.toLowerCase();
            const keywords = pLower.split(/\s+/);
            return keywords.some(keyword => persona.includes(keyword)) || persona.includes(pLower);
          });
        });
        
        // === IMPROVED: Apply geo-weighting to persona-matched audiences ===
        // Score all matched audiences by geography
        const geoScoredPrimary = primaryAudiences.map(a => ({
          ...a,
          geoScore: scoreAudienceByGeo(a, geography),
          geoRelevance: calculateGeoRelevance(a, geography)
        })).sort((a, b) => b.geoScore - a.geoScore);
        
        const geoScoredSecondary = secondaryAudiences.map(a => ({
          ...a,
          geoScore: scoreAudienceByGeo(a, geography),
          geoRelevance: calculateGeoRelevance(a, geography)
        })).sort((a, b) => b.geoScore - a.geoScore);
        
        // Combine based on budget tier limit
        const primaryCount = Math.max(1, Math.floor(tierStrategy.audienceLimit * 0.75));
        const secondaryCount = tierStrategy.audienceLimit - primaryCount;
        
        selectedAudiences = [
          ...geoScoredPrimary.slice(0, primaryCount),
          ...geoScoredSecondary.slice(0, secondaryCount)
        ];
        
        // If still less than limit, fill with remaining primary or top overall
        if (selectedAudiences.length < tierStrategy.audienceLimit) {
          const remaining = currentDatasets.audiences
            .filter(a => !selectedAudiences.includes(a))
            .map(a => ({
              ...a,
              geoScore: scoreAudienceByGeo(a, geography),
              geoRelevance: calculateGeoRelevance(a, geography)
            }))
            .sort((a, b) => b.geoScore - a.geoScore);
          selectedAudiences.push(...remaining.slice(0, tierStrategy.audienceLimit - selectedAudiences.length));
        }
        
        console.log(`✅ Persona-mapped audiences: ${selectedAudiences.length} (limit: ${tierStrategy.audienceLimit})`);
        if (geography && geography.length > 0 && !geography.includes('Malaysia')) {
          console.log(`   🌍 Geo-weighted for: ${geography.join(', ')}`);
          console.log(`   Top audience geo-relevance: ${selectedAudiences[0]?.geoRelevance || 'N/A'}%`);
        }
        
        // === APPLY WHITELIST ENFORCEMENT ===
        if (personaConstraints.whitelist.length > 0) {
          const whitelisted = currentDatasets.audiences.filter(a => {
            const persona = (a.persona || a.name || '').toLowerCase();
            return personaConstraints.whitelist.some(wl => 
              persona.includes(wl.toLowerCase()) || wl.toLowerCase().includes(persona.split(' ')[0])
            );
          });
          
          // Ensure whitelisted personas are included
          whitelisted.forEach(wl => {
            if (!selectedAudiences.find(a => (a.persona || a.name) === (wl.persona || wl.name))) {
              // Replace lowest scoring audience if at limit
              if (selectedAudiences.length >= tierStrategy.audienceLimit) {
                selectedAudiences.pop(); // Remove last (lowest score)
              }
              selectedAudiences.push(wl);
              console.log('[PERSONA] Force-included whitelisted:', wl.persona || wl.name);
            }
          });
        }
      } else {
        // === IMPROVED: Strategic fallback for critical industries ===
        const isCriticalIndustry = isCriticalFitIndustry(audienceVerticalKey);
        
        if (isCriticalIndustry) {
          // Use curated whitelist for critical industries (Beauty, Finance, etc.)
          const fallbackPersonas = getFallbackPersonas(audienceVerticalKey);
          console.log(`⚠️ No persona mapping, but ${audienceVerticalKey} is CRITICAL-FIT industry`);
          console.log(`   Using fallback whitelist:`, fallbackPersonas);
          
          selectedAudiences = currentDatasets.audiences.filter(a => {
            const persona = (a.persona || a.name || '').toLowerCase();
            return fallbackPersonas.some(p => {
              const pLower = p.toLowerCase();
              const keywords = pLower.split(/\s+/);
              return keywords.some(keyword => persona.includes(keyword)) || persona.includes(pLower);
            });
          });
          
          // Apply geo-weighting
          selectedAudiences = selectedAudiences.map(a => ({
            ...a,
            geoScore: scoreAudienceByGeo(a, geography),
            geoRelevance: calculateGeoRelevance(a, geography)
          }));
          
          selectedAudiences.sort((a, b) => b.geoScore - a.geoScore);
          selectedAudiences = selectedAudiences.slice(0, tierStrategy.audienceLimit);
          
          console.log(`   ✅ Selected ${selectedAudiences.length} strategic-fit audiences`);
        } else {
          // Fallback: Industry interest matching for non-critical industries
          console.log('⚠️ No persona mapping, using industry interest matching');
          selectedAudiences = currentDatasets.audiences
            .filter(a => {
              const hasIndustryInterest = a.interests && a.interests.some(i => 
                i && i.toLowerCase().includes(industry.toLowerCase())
              );
              return hasIndustryInterest;
            })
            .sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0))
            .slice(0, tierStrategy.audienceLimit);
          
          if (selectedAudiences.length === 0) {
            console.log('⚠️ No audiences matched industry, falling back to top audiences by reach');
            console.log('   ⚠️ This fallback is acceptable for non-critical industries');
            selectedAudiences = currentDatasets.audiences
              .sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0))
              .slice(0, tierStrategy.audienceLimit);
          }
        }
      }
    }
    
    // Sort final selection by reach and apply tier limit
    selectedAudiences.sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0));
    selectedAudiences = selectedAudiences.slice(0, tierStrategy.audienceLimit);
    
    console.log(`✅ FINAL AUDIENCES: ${selectedAudiences.length} (tier limit: ${tierStrategy.audienceLimit})`);

    // === NEW: CALCULATE UNIQUE REACH (ACCOUNTING FOR OVERLAP) ===
    const personaNames = selectedAudiences.map(a => a.persona || a.name);
    const uniqueReach = calculateUniqueReach(personaNames, currentDatasets.audiences);
    const simpleSum = selectedAudiences.reduce((sum, a) => sum + (a.totalAudience || 0), 0);
    const overlapReduction = simpleSum - uniqueReach;
    
    console.log(`📊 UNIQUE REACH CALCULATION:`);
    console.log(`   Simple sum: ${simpleSum.toLocaleString()}`);
    console.log(`   Unique reach: ${uniqueReach.toLocaleString()}`);
    console.log(`   Overlap reduction: ${overlapReduction.toLocaleString()} (${((overlapReduction / simpleSum) * 100).toFixed(1)}%)`);

    console.log('✅ Final selected audiences:', selectedAudiences.length, selectedAudiences.map(a => a.persona || a.name));

    // 4. SELECT SITES - WITH SEASONAL/CULTURAL PRIORITIZATION
    console.log('🌐 Total sites available:', currentDatasets.sites.length);
    
    let selectedSites = [];
    
    // === SEASONAL/CULTURAL OVERRIDE: Prioritize vernacular/culturally-relevant publishers ===
    if (seasonalContext || culturalContext) {
      console.log('🎊 SEASONAL/CULTURAL SITE SELECTION: Prioritizing vernacular publishers');
      
      // Define cultural site keywords
      const vernacularKeywords = {
        'malay': ['malay', 'melayu', 'utusan', 'berita', 'harian', 'sinar', 'malaysia', 'astro'],
        'chinese': ['chinese', 'mandarin', 'sina', 'oriental', 'nanyang', 'star', 'kwong wah', 'china press'],
        'indian': ['tamil', 'hindu', 'malaysia nanban', 'makkal osai'],
        'sabah_sarawak': ['borneo', 'sarawak', 'sabah', 'daily express', 'utusan borneo']
      };
      
      // Get relevant keywords for this cultural context
      const relevantKeywords = culturalContext ? (vernacularKeywords[culturalContext] || []) : [];
      
      // Priority 1: Cultural/vernacular publishers
      const vernacularSites = currentDatasets.sites.filter(s => {
        const name = (s.name || s.site || '').toLowerCase();
        return relevantKeywords.some(keyword => name.includes(keyword));
      });
      
      // Priority 2: Premium content sites (for festive placement)
      const premiumKeywords = ['astro', 'tonton', 'ott', 'tv', 'streaming', 'media', 'news'];
      const premiumSites = currentDatasets.sites.filter(s => {
        const name = (s.name || s.site || '').toLowerCase();
        return premiumKeywords.some(keyword => name.includes(keyword)) && !vernacularSites.includes(s);
      });
      
      // Priority 3: High-traffic general sites
      const generalSites = currentDatasets.sites
        .filter(s => !vernacularSites.includes(s) && !premiumSites.includes(s))
        .sort((a, b) => (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0));
      
      // Combine: 2-3 vernacular + 1-2 premium + fill with high-traffic
      selectedSites = [
        ...vernacularSites.slice(0, culturalContext ? 3 : 0),
        ...premiumSites.slice(0, 2),
        ...generalSites
      ].slice(0, 5);
      
      console.log(`   ✅ Vernacular sites: ${vernacularSites.length}, Premium: ${premiumSites.length}`);
      console.log(`   Selected mix: ${selectedSites.length} sites for ${culturalContext || 'festive'} campaign`);
    } else {
      // === IMPROVED: Geo-aware site selection ===
      if (geography && geography.length > 0 && !geography.includes('Malaysia')) {
        console.log(`🌐 Geo-aware site selection for regional campaign: ${geography.join(', ')}`);
        
        // Score all sites by geo relevance
        const geoScoredSites = currentDatasets.sites.map(s => ({
          ...s,
          geoScore: scoreSiteByGeo(s, geography),
          isRegional: detectRegionalSite(s, geography)
        }));
        
        // Sort: regional first, then by traffic within each group
        geoScoredSites.sort((a, b) => {
          if (a.isRegional !== b.isRegional) {
            return b.isRegional - a.isRegional;
          }
          // Within same regional status, sort by traffic
          return (b.monthlyTraffic || 0) * b.geoScore - (a.monthlyTraffic || 0) * a.geoScore;
        });
        
        selectedSites = geoScoredSites.slice(0, 5);
        
        const regionalCount = selectedSites.filter(s => s.isRegional).length;
        console.log(`   ✅ Selected ${regionalCount} regional sites out of ${selectedSites.length}`);
      } else {
        // National campaign: standard site selection by traffic
        selectedSites = currentDatasets.sites
          .sort((a, b) => (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0))
          .slice(0, 5);
      }
    }

    // === TYPE GUARD: Ensure selectedSites is always an array ===
    if (!Array.isArray(selectedSites)) {
      console.warn('⚠️ selectedSites is not an array:', typeof selectedSites, selectedSites);
      selectedSites = [];
    }
    
    // === NORMALIZE: Ensure all sites are objects with required properties ===
    selectedSites = selectedSites.map(site => {
      if (typeof site === 'string') {
        // Convert string to site object
        console.warn('⚠️ Site is a string, converting:', site);
        return { name: site, siteName: site, category: 'Web', monthlyTraffic: 0 };
      }
      if (!site || typeof site !== 'object') {
        console.warn('⚠️ Invalid site entry:', site);
        return null;
      }
      // Ensure consistent properties
      return {
        ...site,
        name: site.name || site.siteName || site.Property || 'Unknown',
        siteName: site.siteName || site.name || site.Property || 'Unknown',
        category: site.category || site.Category || 'Web',
        monthlyTraffic: site.monthlyTraffic || site['Total impressions'] || 0
      };
    }).filter(site => site !== null);
    
    console.log('✅ Selected sites (normalized):', selectedSites.length, selectedSites.map(s => s.name));
    
    // === NEW: APPLY FORMAT-SITE COMPATIBILITY FILTERING ===
    // Transform selectedSites into channel groups for filtering
    const sitesByChannel = {};
    selectedSites.forEach(site => {
      const channel = site.category || 'Web';
      if (!sitesByChannel[channel]) {
        sitesByChannel[channel] = [];
      }
      sitesByChannel[channel].push(site);
    });
    
    console.log('[TARGET] Applying format-site compatibility filtering...');
    const compatibleSites = getCompatibleSites(selectedFormats, sitesByChannel);
    
    // Flatten back to array with type guard
    selectedSites = Object.values(compatibleSites).flat().filter(site => site && typeof site === 'object');
    
    // TYPE GUARD: Ensure still an array after flattening
    if (!Array.isArray(selectedSites)) {
      console.error('❌ selectedSites became non-array after flattening:', typeof selectedSites);
      selectedSites = [];
    }
    
    console.log(`✅ Compatible sites after format filtering: ${selectedSites.length}`);
    
    // === NEW: APPLY LANGUAGE FILTERING (WEB SITES ONLY) ===
    if (fullBrief.targetLanguages && fullBrief.targetLanguages.length > 0) {
      console.log('🌍 Applying language filtering...');
      const languageFilteredSites = filterSitesByLanguage(
        { Web: selectedSites.filter(s => s.category === 'Web' || !s.category), 
          OTT: selectedSites.filter(s => s.category === 'OTT'),
          Social: selectedSites.filter(s => s.category === 'Social') },
        fullBrief.targetLanguages
      );
      selectedSites = Object.values(languageFilteredSites).flat().filter(site => site && typeof site === 'object');
      
      // TYPE GUARD after language filtering
      if (!Array.isArray(selectedSites)) {
        console.error('❌ selectedSites became non-array after language filtering');
        selectedSites = [];
      }
      
      console.log(`✅ Sites after language filtering: ${selectedSites.length}`);
    }

    // === FINAL TYPE GUARD BEFORE SCORING ===
    if (!Array.isArray(selectedSites)) {
      console.error('❌ CRITICAL: selectedSites is not an array before scoring!', typeof selectedSites);
      selectedSites = [];
    }
    
    if (selectedSites.length === 0) {
      console.warn('⚠️ No sites available for scoring, cannot generate plan');
      return null;
    }

    // === NEW: APPLY INTELLIGENT SCORING TO SITES ===
    console.log('[TARGET] Applying intelligent site scoring...');
    const scoredSites = scoreSites(selectedSites, {
      campaign_objective,
      industry,
      geography: fullBrief.geography || [],
      audience: selectedAudiences,
      budget_rm
    }, selectedFormats);
    
    // Take top scored sites (limit to 10 for display, but keep all for allocation)
    const topScoredSites = scoredSites.slice(0, 10);
    console.log(`✅ Scored sites - Top site: ${topScoredSites[0]?.name || topScoredSites[0]?.siteName} (${topScoredSites[0]?.confidence}% confidence)`);
    
    // Use scored sites for plan display
    selectedSites = scoredSites;

    // 5. BUDGET-TIER-BASED STRATEGIC ALLOCATION
    // (Budget tier already determined earlier for use throughout the plan)
    console.log('[BUDGET] APPLYING TIER STRATEGY TO ALLOCATION:', {
      tier: budgetTier,
      strategy: tierStrategy.name,
      budget: budget_rm,
      maxPlatforms: tierStrategy.maxPlatforms,
      audienceLimit: tierStrategy.audienceLimit
    });
    
    const lineItems = [];
    const rateCount = selectedRates.length;

    if (rateCount === 0) return null;
    
    // === FILTER RATES BY TIER STRATEGY ===
    let tierFilteredRates = selectedRates.filter(rate => {
      const buyType = rate.actualBuyType || rate['Buy Type'] || 'Direct';
      
      // Low tier: Direct only
      if (budgetTier === 'low') {
        return buyType === 'Direct';
      }
      
      // Mid tier: Direct + PD
      if (budgetTier === 'mid') {
        return buyType === 'Direct' || buyType === 'PD';
      }
      
      // High tier: All types
      return true;
    });
    
    console.log(`   Filtered rates: ${tierFilteredRates.length} (from ${selectedRates.length})`);
    
    // === OBJECTIVE-BASED CHANNEL PRIORITIZATION ===
    let channelPriority = [];
    
    if (campaign_objective === 'Awareness' || campaign_objective === 'VideoView') {
      if (budgetTier === 'low') {
        // Low budget: Social/Display focus
        channelPriority = ['Social', 'Display', 'Video'];
      } else if (budgetTier === 'mid') {
        // Mid budget: Video + Display + Social
        channelPriority = ['Video', 'Display', 'Social', 'Native'];
      } else {
        // High budget: Video-first with OTT
        channelPriority = ['Video', 'OTT', 'Display', 'Social', 'Native', 'Premium'];
      }
    } else if (campaign_objective === 'Traffic' || campaign_objective === 'Engagement') {
      if (budgetTier === 'low') {
        // Low budget: Display + Native
        channelPriority = ['Display', 'Native', 'Social'];
      } else if (budgetTier === 'mid') {
        // Mid budget: Display + Video + Native
        channelPriority = ['Display', 'Video', 'Native', 'Social'];
      } else {
        // High budget: Multi-format with retargeting
        channelPriority = ['Display', 'Video', 'Native', 'Social', 'Retargeting'];
      }
    } else {
      // Conversion/Sales: Performance-optimized
      if (budgetTier === 'low') {
        // Low budget: Native + Display
        channelPriority = ['Native', 'Display', 'Social'];
      } else if (budgetTier === 'mid') {
        // Mid budget: Native + Display + Retargeting
        channelPriority = ['Native', 'Display', 'Retargeting', 'Social'];
      } else {
        // High budget: Full funnel
        channelPriority = ['Native', 'Display', 'Retargeting', 'Video', 'Social'];
      }
    }
    
    console.log(`   Channel priority: ${channelPriority.join(' > ')}`);
    
    // === SMART PLATFORM SELECTION ===
    const sortedRates = tierFilteredRates.sort((a, b) => {
      const aPillar = a.Pillar || a.pillar || '';
      const bPillar = b.Pillar || b.pillar || '';
      const aIndex = channelPriority.indexOf(aPillar);
      const bIndex = channelPriority.indexOf(bPillar);
      
      const aScore = aIndex >= 0 ? aIndex : 999;
      const bScore = bIndex >= 0 ? bIndex : 999;
      
      if (aScore !== bScore) return aScore - bScore;
      
      // Secondary sort by CPM (lower = better for reach, higher = better for premium)
      if (budgetTier === 'high' && priority !== 'Max Reach') {
        return b.selectedCPM - a.selectedCPM;  // Higher CPM first for premium
      }
      return a.selectedCPM - b.selectedCPM;  // Lower CPM first for efficiency
    });
    
    // === LIMIT BY TIER ===
    const finalRates = sortedRates.slice(0, tierStrategy.maxPlatforms);
    
    console.log(`   Final platforms: ${finalRates.length}`);
    console.log(`   Mix: ${finalRates.map(r => r.Pillar).join(', ')}`);
    
    // === BUDGET ALLOCATION BY TIER ===
    const allocations = [];
    const mixValues = Object.values(tierStrategy.channelMix);
    
    finalRates.forEach((rate, idx) => {
      const allocation = mixValues[idx] || mixValues[mixValues.length - 1];
      allocations.push(allocation);
    });
    
    // Normalize to ensure sum = 1
    const allocSum = allocations.reduce((a, b) => a + b, 0);
    const normalizedAllocations = allocations.map(a => a / allocSum);
    
    console.log(`   Allocations: ${normalizedAllocations.map(a => (a * 100).toFixed(0) + '%').join(', ')}`);
    
    // === CREATE LINE ITEMS ===
    finalRates.forEach((rate, idx) => {
      const allocation = normalizedAllocations[idx];
      const lineBudget = budget_rm * allocation;
      const impressions = Math.floor((lineBudget / rate.selectedCPM) * 1000);
      
      lineItems.push({
        platform: rate.Platform,
        pillar: rate.Pillar,
        type: rate['Type of Platform'],
        format: rate['Ad format'] || rate.Format || '',
        formatName: rate.name || rate['Ad format'] || '',
        budget: lineBudget,
        allocatedBudget: lineBudget,  // For channel enforcement tracking
        cpm: rate.selectedCPM,
        impressions: impressions,
        buyType: rate.actualBuyType
      });
    });
    
    // === VALIDATION: Check for strategic variation ===
    const uniquePillars = new Set(lineItems.map(item => item.pillar));
    const hasPD = lineItems.some(item => item.buyType === 'PD');
    const hasPG = lineItems.some(item => item.buyType === 'PG');
    
    console.log(`✅ TIER VALIDATION:`);
    console.log(`   Unique channels: ${uniquePillars.size}`);
    console.log(`   Has PD: ${hasPD}`);
    console.log(`   Has PG: ${hasPG}`);
    console.log(`   Line items: ${lineItems.length}`);
    
    // Validation check
    if (budgetTier === 'high' && !hasPD) {
      console.warn('⚠️ Strategy warning: High budget should include PD buying type');
    }
    if (budgetTier === 'low' && (hasPD || hasPG)) {
      console.warn('⚠️ Strategy warning: Low budget should not include PD/PG');
    }
    if (lineItems.length === tierStrategy.maxPlatforms && uniquePillars.size < 2) {
      console.warn('⚠️ Strategy failure: platform mix did not change by budget tier');
    }

    // === IMPROVED: ENFORCE CHANNEL PREFERENCE ===
    let enforcedLineItems = lineItems;
    // channelPref already declared earlier (line 1086)
    
    if (channelPref && channelPref !== 'Balanced' && CHANNEL_CONSTRAINTS[channelPref]) {
      console.log(`\n[TARGET] ENFORCING CHANNEL PREFERENCE: ${channelPref}`);
      
      const constraint = CHANNEL_CONSTRAINTS[channelPref];
      console.log(`   Minimum share required: ${(constraint.minShare * 100).toFixed(0)}%`);
      
      // Calculate current channel shares
      const currentShares = calculateChannelShares(lineItems, constraint.keywords);
      const currentPreferredShare = currentShares.preferred / budget_rm;
      
      console.log(`   Current ${constraint.channelLabel} budget: RM ${currentShares.preferred.toLocaleString()}`);
      console.log(`   Current ${constraint.channelLabel} share: ${(currentPreferredShare * 100).toFixed(1)}%`);
      
      if (currentPreferredShare < constraint.minShare) {
        console.log(`   ⚠️ Below minimum! Rebalancing...`);
        enforcedLineItems = rebalanceToMeetMinShare(lineItems, constraint, budget_rm);
        
        // Recalculate and log new shares
        const newShares = calculateChannelShares(enforcedLineItems, constraint.keywords);
        const newPreferredShare = newShares.preferred / budget_rm;
        
        console.log(`   ✅ Adjusted ${constraint.channelLabel} budget: RM ${newShares.preferred.toLocaleString()}`);
        console.log(`   ✅ New ${constraint.channelLabel} share: ${(newPreferredShare * 100).toFixed(1)}%`);
      } else {
        console.log(`   ✅ Already meets minimum requirement`);
      }
    }
    
    // Use enforced line items for final calculations
    const finalLineItems = enforcedLineItems.map(item => ({
      ...item,
      budget: item.allocatedBudget || item.budget
    }));
    
    const totalImpressions = finalLineItems.reduce((sum, item) => sum + (item.impressions || 0), 0);
    // Use unique reach instead of simple sum
    const totalReach = uniqueReach || selectedAudiences.reduce((sum, a) => sum + (a.totalAudience || 0), 0);
    const avgCPM = budget_rm > 0 && totalImpressions > 0 ? (budget_rm / totalImpressions) * 1000 : 0;
    const weeklyBudget = duration_weeks > 0 ? budget_rm / duration_weeks : budget_rm;
    const weeklyImpressions = duration_weeks > 0 && totalImpressions > 0 ? totalImpressions / duration_weeks : totalImpressions;
    
    // === NEW: VALIDATE TIER COMPLIANCE ===
    const tierWarnings = validateTierCompliance(finalLineItems, budgetTier, tierStrategy);
    if (tierWarnings.length > 0) {
      console.warn('⚠️ TIER COMPLIANCE WARNINGS:', tierWarnings);
    }

    // === NEW: GENERATE OPTIMIZATION STRATEGY ===
    const optimizationStrategy = generateOptimizationStrategy(
      campaign_objective,
      budgetTier,
      duration_weeks || 4,
      {
        formats: selectedFormats,
        sites: selectedSites,
        audiences: selectedAudiences,
        geography: fullBrief.geography || []
      }
    );
    console.log('📊 Generated optimization strategy:', optimizationStrategy.approach);

    return {
      brief: fullBrief,
      formats: selectedFormats,
      audiences: selectedAudiences,
      sites: selectedSites,
      lineItems: finalLineItems,
      // NEW: Include inventory validation and tier info
      inventoryValidation,
      budgetTier,
      tierStrategy,
      tierWarnings,
      optimizationStrategy, // NEW: Add optimization strategy
      summary: {
        totalBudget: budget_rm || 0,
        totalImpressions: totalImpressions || 0,
        estimatedReach: totalReach || 0, // Now using unique reach
        uniqueReach: uniqueReach || 0, // Explicit unique reach field
        simpleReachSum: selectedAudiences.reduce((sum, a) => sum + (a.totalAudience || 0), 0),
        avgCPM: avgCPM || 0,
        devices: (devices && devices.length > 0) ? devices.join(', ') : 'All Devices',
        geography: (geography && geography.length > 0) ? geography.join(', ') : 'Malaysia',
        durationWeeks: duration_weeks || 4,
        weeklyBudget: weeklyBudget || 0,
        weeklyImpressions: weeklyImpressions || 0
      }
    };
  };

  // === OPENAI-POWERED MESSAGE HANDLER ===
  const handleSendMessageWithOpenAI = async () => {
    if (!inputMessage.trim() || isLoading || pendingRequestRef.current) return;

    // Prevent duplicate calls
    pendingRequestRef.current = true;

    const userMessage = inputMessage.trim();
    addMessage('user', userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      const requestStartTime = Date.now();
      console.log('[AI WIZARD] Sending to OpenAI:', userMessage);
      console.log('[AI WIZARD] Current brief:', brief);
      console.log('[AI WIZARD] Conversation history:', messages.length, 'messages');

      // === PERSONA CONSTRAINT DETECTION ===
      const userMessageLower = userMessage.toLowerCase();
      const currentDatasets = datasetsRef.current;
      
      // Blacklist detection
      const blacklistPatterns = [
        /(?:don't|dont|do not|not|no)\s+want\s+(.+)/i,
        /(?:exclude|remove|drop)\s+(.+)/i
      ];
      
      for (const pattern of blacklistPatterns) {
        const match = userMessageLower.match(pattern);
        if (match) {
          const mentioned = match[1].trim();
          const matchedPersonas = currentDatasets.audiences.filter(a => {
            const persona = (a.persona || a.name || '').toLowerCase();
            return persona.includes(mentioned) || mentioned.split(/\s+/).some(word => persona.includes(word));
          });
          
          if (matchedPersonas.length > 0) {
            const personaNames = matchedPersonas.map(p => p.persona || p.name);
            setPersonaConstraints(prev => ({
              ...prev,
              blacklist: [...new Set([...prev.blacklist, ...personaNames])]
            }));
            console.log('[PERSONA] Blacklisted:', personaNames);
          }
        }
      }
      
      // Whitelist detection
      const whitelistPatterns = [
        /(?:i\s+)?(?:want|wanna keep|keep|include|add)\s+(.+)/i,
        /(?:how about|what about)\s+(.+)/i
      ];
      
      for (const pattern of whitelistPatterns) {
        const match = userMessageLower.match(pattern);
        if (match) {
          const mentioned = match[1].trim();
          const matchedPersonas = currentDatasets.audiences.filter(a => {
            const persona = (a.persona || a.name || '').toLowerCase();
            return persona.includes(mentioned) || mentioned.split(/\s+/).some(word => persona.includes(word));
          });
          
          if (matchedPersonas.length > 0) {
            const personaNames = matchedPersonas.map(p => p.persona || p.name);
            setPersonaConstraints(prev => ({
              ...prev,
              whitelist: [...new Set([...prev.whitelist, ...personaNames])]
            }));
            console.log('[PERSONA] Whitelisted:', personaNames);
          }
        }
      }

      // Send to OpenAI with conversation history and current brief
      // Get last AI message's extractedEntities to maintain step tracking
      const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
      const lastExtractedEntities = lastAIMessage?.data || {};
      
      const result = await sendAIMessage(
        userMessage,
        messages,
        brief,
        lastExtractedEntities // Pass currentStep and other entities from last AI message
      );

      const requestElapsed = Date.now() - requestStartTime;
      console.log(`[AI WIZARD] ⏱️ OpenAI response received in ${requestElapsed}ms (${(requestElapsed/1000).toFixed(1)}s)`);
      console.log('[AI WIZARD] OpenAI response:', result);

      if (result.success) {
        // Clean and format AI's response - NEVER show JSON to users
        let cleanResponse = result.response;
        
        // CRITICAL: Remove any JSON artifacts that might be in the response
        if (cleanResponse.startsWith('{') || cleanResponse.includes('"response"') || cleanResponse.includes('extractedEntities')) {
          try {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(cleanResponse);
            cleanResponse = parsed.response || parsed.message || cleanResponse;
          } catch (e) {
            // If parsing fails, try to extract text between quotes
            const match = cleanResponse.match(/"response"\s*:\s*"([^"]+)"/);
            if (match) {
              cleanResponse = match[1];
            } else {
              // Last resort: remove JSON artifacts manually
              cleanResponse = cleanResponse
                .replace(/^\{.*?"response"\s*:\s*"/i, '')
                .replace(/".*?\}$/i, '')
                .replace(/\{[^}]*\}/g, '') // Remove any remaining JSON objects
                .replace(/"extractedEntities".*$/i, '')
                .trim();
            }
          }
        }
        
        // Remove literal \n and replace with actual newlines
        cleanResponse = cleanResponse.replace(/\\n/g, '\n');
        
        // Remove excessive whitespace and normalize spacing
        cleanResponse = cleanResponse
          .split('\n') // Split by lines
          .map(line => line.trim()) // Trim each line
          .filter(line => line.length > 0) // Remove empty lines
          .join(' ') // Join with spaces
          .trim();
        
        // Final safety check: ensure no JSON-like patterns remain
        if (cleanResponse.includes('{') || cleanResponse.includes('}') || cleanResponse.includes('"response"')) {
          console.warn('[AI WIZARD] JSON detected in response, cleaning further');
          // Extract only readable text, remove all JSON
          cleanResponse = cleanResponse
            .replace(/\{[^}]*\}/g, '')
            .replace(/[\{\}]/g, '')
            .replace(/"[^"]*":\s*/g, '')
            .trim();
        }
        
        // Add AI's response to chat (guaranteed clean) with extractedEntities as data
        addMessage('assistant', cleanResponse, result.extractedEntities);

        // Update brief with extracted entities
        if (result.extractedEntities && Object.keys(result.extractedEntities).length > 0) {
          console.log('[AI WIZARD] Updating brief with extracted entities:', result.extractedEntities);
          
          setBrief(prev => {
            const updated = { ...prev };
            
            // Merge extracted entities (only non-null values)
            Object.entries(result.extractedEntities).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                updated[key] = value;
              }
            });
            
            // === FUZZY DATE PARSING ===
            // If user mentioned dates but startDate is still null, try to parse from recent messages
            if (!updated.startDate && messages.length > 0) {
              // Check last few user messages for date mentions
              const recentMessages = messages.slice(-3).filter(m => m.role === 'user');
              for (const msg of recentMessages) {
                const dateResult = parseFuzzyDateRange(msg.content);
                if (dateResult.parsed && dateResult.confidence >= 50) {
                  console.log('[DATE PARSER] Extracted date range:', dateResult);
                  updated.startDate = dateResult.startDate;
                  updated.endDate = dateResult.endDate;
                  updated.duration_weeks = dateResult.durationWeeks;
                  
                  // If confidence is low, we should ask for confirmation in next response
                  if (dateResult.confidence < 80) {
                    console.log('[DATE PARSER] Low confidence, may need confirmation');
                  }
                  break;
                }
              }
            }
            
            console.log('[AI WIZARD] Updated brief:', updated);
            return updated;
          });
        }

        // Check if we have enough information to generate a plan
        const updatedBrief = result.extractedEntities ? { ...brief, ...result.extractedEntities } : brief;
        
        const hasEssentialInfo = (
          updatedBrief.product_brand &&
          updatedBrief.campaign_objective &&
          updatedBrief.budget_rm &&
          updatedBrief.geography
        );

        if (hasEssentialInfo && !recommendations) {
          console.log('[AI WIZARD] Sufficient info collected, generating plan...');
          // Auto-generate plan after collecting essential info
          setTimeout(async () => {
            setIsLoading(true);
            try {
              // Ensure all required fields have defaults
              const planBrief = {
                ...updatedBrief,
                industry: updatedBrief.industry || 'Retail',
                duration_weeks: updatedBrief.duration_weeks || 4,
                devices: updatedBrief.devices || ['Desktop', 'Mobile']
              };
              
              console.log('🚀 Generating plan with brief:', planBrief);
              const plan = generateMediaPlan(planBrief);
              
              if (plan) {
                setRecommendations(plan);
                showMediaPlan(plan);
                
                // Auto-save campaign as draft
                setTimeout(async () => {
                  try {
                    const campaignId = await handleSaveCampaign(true);
                    if (campaignId) {
                      console.log('✅ Auto-saved campaign:', campaignId);
                    }
                  } catch (error) {
                    console.error('❌ Auto-save failed:', error);
                  }
                }, 1000);
              }
            } catch (error) {
              console.error('❌ Plan generation failed:', error);
              addMessage('assistant', "I encountered an error generating the plan. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }, 500);
        }

      } else {
        // Check if request was cancelled
        if (result.cancelled) {
          console.log('[AI WIZARD] Request cancelled by user');
          // Don't add any message - the stop handler already added one
        } else {
          console.error('[AI WIZARD] OpenAI error:', result.error);
          addMessage('assistant', result.response || "I'm having trouble processing that. Could you rephrase?");
        }
      }

    } catch (error) {
      console.error('[AI WIZARD] Error:', error);
      // Don't show error if it was an abort
      if (error.name !== 'AbortError') {
        addMessage('assistant', "I encountered an error. Please try again or rephrase your message.");
      }
    } finally {
      setIsLoading(false);
      pendingRequestRef.current = false; // Reset flag
    }
  };

  // === HANDLE USER MESSAGE (ORIGINAL RULE-BASED - KEPT AS FALLBACK) ===
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    addMessage('user', userMessage);
    setInputMessage('');
    setIsLoading(true);

    // Extract entities from user message
    const updates = extractEntities(userMessage, brief);
    
    // CRITICAL: Preserve _needsBudgetSuggestion if it was set before
    // (user shouldn't have to repeat "please propose" every message)
    if (brief._needsBudgetSuggestion && !updates.budget_rm) {
      updates._needsBudgetSuggestion = true;
    }
    
    const newBrief = { ...brief, ...updates };
    setBrief(newBrief);

    // Debug: Log what we extracted
    console.log('🧠 Extracted entities:', updates);
    console.log('📋 Current brief:', newBrief);
    console.log('📝 From message:', userMessage);
    console.log('🔍 Industry extracted?', newBrief.industry);

    setTimeout(() => {
      const lower = userMessage.toLowerCase();
      
      // === CONSULTATIVE APPROACH: INFER AND RECOMMEND ===
      
      // === STRATEGIC CLARIFICATION - Ask ONLY what affects planning ===
      const askedBefore = {
        industry: messages.some(m => m.role === 'assistant' && m.content.match(/industry|category/i)),
        creative: messages.some(m => m.role === 'assistant' && m.content.match(/video|asset|creative|banner/i)),
        buyingType: messages.some(m => m.role === 'assistant' && m.content.match(/buying|direct|pg|pd/i)),
        geography: messages.some(m => m.role === 'assistant' && m.content.match(/geography|location|states|klang valley/i)),
        duration: messages.some(m => m.role === 'assistant' && m.content.match(/duration|weeks|long|festive/i))
      };

      // CORE PLANNING VARIABLES - Infer aggressively
      
      // 1. INDUSTRY - Infer from context or default
      if (!newBrief.industry) {
        if (newBrief.product_brand) {
          const product = newBrief.product_brand.toLowerCase();
          if (product.match(/shop|store|retail|fashion|clothing/i)) {
            newBrief.industry = 'Retail';
          } else if (product.match(/food|drink|milk|snack|fmcg/i)) {
            newBrief.industry = 'FMCG';
          } else if (product.match(/car|auto|vehicle/i)) {
            newBrief.industry = 'Automotive';
          } else if (product.match(/property|condo|house|real estate/i)) {
            newBrief.industry = 'Property';
          } else if (product.match(/bank|credit card|loan|insurance|invest|financ|saving|account/i)) {
            newBrief.industry = 'Banking';
          } else {
            newBrief.industry = 'Retail'; // Safe default
          }
          setBrief(newBrief);
          console.log('🧠 Inferred industry:', newBrief.industry);
        } else {
          // No product info - default to Retail (never ask)
          newBrief.industry = 'Retail';
          setBrief(newBrief);
          console.log('🧠 Defaulted to Retail');
        }
      }
      
      // Step 2: Objective - ALWAYS INFER if missing
      let objective = newBrief.campaign_objective;
      if (!objective) {
        // PRIORITY 1: Explicit campaign mentions
        if (lower.match(/launch|new|introduce|announce/i)) {
          objective = 'Awareness';
          console.log('🧠 Inferred Awareness (launch keywords)');
        }
        // PRIORITY 2: Sales/commerce indicators  
        else if (lower.match(/sales|ecomm|e-commerce|shop|store|buy|purchase/i)) {
          objective = 'Traffic';
          console.log('🧠 Inferred Traffic (sales/ecommerce)');
        }
        // PRIORITY 3: Lead generation indicators
        else if (lower.match(/leads?|sign.?up|registration|enquir/i)) {
          objective = 'LeadGen';
          console.log('🧠 Inferred LeadGen (lead keywords)');
        }
        // PRIORITY 4: Industry-based defaults
        else if (newBrief.industry === 'FMCG' || newBrief.industry === 'Retail') {
          objective = 'Awareness'; // FMCG/Retail often awareness
          console.log('🧠 Inferred Awareness (FMCG/Retail default)');
        }
        else if (newBrief.industry === 'Property' || newBrief.industry === 'Automotive') {
          objective = 'Awareness'; // High-ticket items = awareness
          console.log('🧠 Inferred Awareness (Property/Auto default)');
        }
        else if (newBrief.industry === 'Banking') {
          objective = 'Consideration'; // Banking = consideration
          console.log('🧠 Inferred Consideration (Banking default)');
        }
        // FALLBACK: Default to Awareness (never ask)
        else {
          objective = 'Awareness';
          console.log('🧠 Defaulting to Awareness');
        }
        
        // Set inferred objective - NEVER ask
        newBrief.campaign_objective = objective;
        setBrief(newBrief);
      }
      
      // Step 3: Budget - Provide options OR infer, NEVER ask directly
      if (!newBrief.budget_rm) {
        // If user indicated budget uncertainty, offer 2-3 options
        if (newBrief._needsBudgetSuggestion && !brief._showingScenarios) {
          // User indicated budget flexibility - PROVIDE 3 SCENARIOS (VERTICAL-SPECIFIC)
          console.log('💡 User needs budget suggestion - providing 3 playbook-based scenarios');
          
          const productDesc = newBrief.product_brand || newBrief.industry.toLowerCase() + ' product';
          
          // Get vertical-specific budget tiers
          const verticalKey = newBrief._vertical_key || findVerticalFromText(newBrief.industry);
          const verticalConfig = getVerticalConfig(verticalKey || newBrief.industry);
          
          let tier1, tier2, tier3;
          let tier1Reach, tier2Reach, tier3Reach;
          let tier1Use, tier2Use, tier3Use;
          
          if (verticalConfig) {
            // Vertical-specific budget recommendations based on strategy_dna
            const isHighTicket = verticalConfig.label.match(/Automotive|Property|Banking/i);
            const isPerformance = verticalConfig.label.match(/E-commerce|Telco|E-wallet/i);
            
            if (isHighTicket) {
              tier1 = 100000; tier2 = 200000; tier3 = 400000;
              tier1Reach = '1.2M-1.5M'; tier2Reach = '2.5M-3M'; tier3Reach = '5M-6M';
              tier1Use = 'Localized launches, specific models/units'; 
              tier2Use = 'Full market launch, multi-location'; 
              tier3Use = 'Nationwide premium campaign';
            } else if (isPerformance) {
              tier1 = 40000; tier2 = 80000; tier3 = 150000;
              tier1Reach = '600K-800K'; tier2Reach = '1.2M-1.8M'; tier3Reach = '2.5M-3.5M';
              tier1Use = 'Acquisition test, offer promotion'; 
              tier2Use = 'Standard acquisition campaign'; 
              tier3Use = 'High-volume acquisition + retention';
            } else {
              tier1 = 50000; tier2 = 100000; tier3 = 200000;
              tier1Reach = '800K-1M'; tier2Reach = '1.5M-2M'; tier3Reach = '3M-4M';
              tier1Use = 'Efficient reach, limited geography'; 
              tier2Use = 'Balanced reach, standard campaign'; 
              tier3Use = 'Premium impact, nationwide';
            }
          } else {
            // Fallback generic tiers
            tier1 = 50000; tier2 = 100000; tier3 = 200000;
            tier1Reach = '800K-1M'; tier2Reach = '1.5M-2M'; tier3Reach = '3M-4M';
            tier1Use = 'Testing market response'; 
            tier2Use = 'Standard product launches'; 
            tier3Use = 'Major brand launches';
          }
          
          // Apply seasonal multiplier to budget tiers if present
          let seasonalNote = '';
          let seasonalMultiplier = 1.0;
          if (newBrief._seasonalContext) {
            const seasonalNames = {
              'cny': 'Chinese New Year',
              'raya': 'Hari Raya',
              'deepavali': 'Deepavali',
              'gawai': 'Gawai',
              'valentines': "Valentine's Day",
              'mothers_day': "Mother's Day",
              'festive_general': 'Festive Season'
            };
            const seasonName = seasonalNames[newBrief._seasonalContext] || newBrief._seasonalContext;
            
            // Major festivals get +50%, others get +30%
            if (['cny', 'raya', 'deepavali'].includes(newBrief._seasonalContext)) {
              seasonalMultiplier = 1.5;
              seasonalNote = `\n\n🎊 **${seasonName} Premium (+50%):** Festive campaigns require higher share-of-voice during peak season. These budgets include premium for Chinese/Malay vernacular publishers and premium OTT/video formats.`;
            } else {
              seasonalMultiplier = 1.3;
              seasonalNote = `\n\n🎊 **${seasonName} Premium (+30%):** Seasonal campaigns benefit from increased visibility. These budgets include premium for relevant audience targeting and enhanced creative formats.`;
            }
            
            // Apply multiplier to tiers
            tier1 = Math.round(tier1 * seasonalMultiplier / 10000) * 10000;
            tier2 = Math.round(tier2 * seasonalMultiplier / 10000) * 10000;
            tier3 = Math.round(tier3 * seasonalMultiplier / 10000) * 10000;
          }
          
          const response = `Understood. For ${productDesc} ${objective.toLowerCase()} campaign, here are 3 ${verticalConfig ? verticalConfig.label : 'recommended'} options:

**RM ${tier1.toLocaleString()} (Efficient Start)**
• ${tier1Reach} estimated reach
• Best for: ${tier1Use}

**RM ${tier2.toLocaleString()} (Balanced Coverage)** ✓ Recommended
• ${tier2Reach} estimated reach
• Best for: ${tier2Use}

**RM ${tier3.toLocaleString()}+ (Premium Impact)**
• ${tier3Reach} estimated reach
• Best for: ${tier3Use}${seasonalNote}

Based on typical ${newBrief.industry} ${objective} campaigns${newBrief._seasonalContext ? ' with seasonal premium' : ''}, I recommend RM ${tier2.toLocaleString()} for optimal results.

Would you like to proceed with one of these? Or tell me your budget preference.`;
          
          addMessage('assistant', response);
          
          // DON'T set budget yet - wait for user selection
          const updatedBrief = { ...newBrief, _budgetSuggested: true, _showingScenarios: true };
          setBrief(updatedBrief);
          
          setIsLoading(false);
          return;
        } else if (newBrief._showingScenarios || brief._showingScenarios) {
          // User is responding to scenarios - parse their choice
          console.log('💡 User responded to scenarios, parsing selection');
          
          // Get vertical config to determine tier values
          const verticalKey = newBrief._vertical_key || findVerticalFromText(newBrief.industry);
          const verticalConfig = getVerticalConfig(verticalKey || newBrief.industry);
          
          let tier1, tier2, tier3;
          if (verticalConfig) {
            const isHighTicket = verticalConfig.label.match(/Automotive|Property|Banking/i);
            const isPerformance = verticalConfig.label.match(/E-commerce|Telco|E-wallet/i);
            
            if (isHighTicket) {
              tier1 = 100000; tier2 = 200000; tier3 = 400000;
            } else if (isPerformance) {
              tier1 = 40000; tier2 = 80000; tier3 = 150000;
            } else {
              tier1 = 50000; tier2 = 100000; tier3 = 200000;
            }
          } else {
            tier1 = 50000; tier2 = 100000; tier3 = 200000;
          }
          
          // Apply seasonal multiplier to match what was shown to user
          if (newBrief._seasonalContext) {
            let seasonalMultiplier = 1.0;
            if (['cny', 'raya', 'deepavali'].includes(newBrief._seasonalContext)) {
              seasonalMultiplier = 1.5; // +50% for major festivals
            } else {
              seasonalMultiplier = 1.3; // +30% for other seasonal
            }
            
            tier1 = Math.round(tier1 * seasonalMultiplier / 10000) * 10000;
            tier2 = Math.round(tier2 * seasonalMultiplier / 10000) * 10000;
            tier3 = Math.round(tier3 * seasonalMultiplier / 10000) * 10000;
          }
          
          let selectedBudget = tier2; // Default to mid-tier
          
          if (lower.match(/efficient|option 1|tier 1|first/i)) {
            selectedBudget = tier1;
          } else if (lower.match(/premium|option 3|tier 3|third/i)) {
            selectedBudget = tier3;
          } else if (lower.match(/balanced|option 2|tier 2|second|recommend/i)) {
            selectedBudget = tier2;
          }
          // Any other response defaults to tier2 (recommended)
          
          console.log(`✅ Selected budget: RM ${selectedBudget}`);
          newBrief.budget_rm = selectedBudget;
          newBrief._showingScenarios = false;
          setBrief(newBrief);
          
          // Don't return here - let it fall through to generate plan
        } else {
          // CRITICAL: Do NOT infer budget unless user explicitly asks for guidance
          // If user only states timing/objective, proceed WITHOUT budget
          // Build platform/format strategy first, NOT budget scale
          console.log('⚠️ No budget specified - will ask user to specify or proceed with strategy-first approach');
          
          // If user has given enough strategic info (objective + industry), ask for budget
          if (newBrief.campaign_objective && newBrief.industry) {
            addMessage('assistant', 'What budget are you working with for this campaign?');
            setIsLoading(false);
            return;
          }
        }
      }
      
      // === STRATEGIC CLARIFICATION QUESTIONS (MAX 1 AT A TIME) ===
      // Ask ONLY for the 4 variables that MATERIALLY affect planning
      
      const needsClarification = newBrief.campaign_objective && newBrief.industry && newBrief.budget_rm;
      
      if (needsClarification) {
        // 1. CHANNEL PREFERENCE (affects platform mix) - ASKED FIRST
        // Ask which channel to focus on: OTT, Social, or Display
        // Ask which channel to focus on: OTT, Social, or Display
        const askedChannelPreference = newBrief._meta?.clarificationsAsked?.channel_preference;
        
        if (!askedChannelPreference && !newBrief.channel_preference) {
          // Only ask if we have objective, industry, and budget
          if (newBrief.campaign_objective && newBrief.industry && newBrief.budget_rm) {
            console.log('📺 Asking about channel preference');
            
            const channelQuestion = `Which channel would you like to focus on?\n\n` +
              `1️⃣ **OTT/Streaming** (YouTube, Astro GO, Sooka)\n` +
              `2️⃣ **Social Media** (Facebook, Instagram, TikTok)\n` +
              `3️⃣ **Display** (Astro Awani, Gempak, Media Hiburan, Stadium Astro, KULT Display Network)\n` +
              `4️⃣ **Balanced Mix** (Let me optimize across all channels) ⭐\n\n` +
              `This will focus your budget on the most effective platforms for your goals.`;
            
            addMessage('assistant', channelQuestion);
            
            // Mark that we've asked
            newBrief._meta = newBrief._meta || {};
            newBrief._meta.clarificationsAsked = newBrief._meta.clarificationsAsked || {};
            newBrief._meta.clarificationsAsked.channel_preference = true;
            setBrief(newBrief);
            
            setIsLoading(false);
            return; // Stop here, wait for user response
          }
        }
        
        // Process channel preference response
        if (askedChannelPreference && !newBrief.channel_preference) {
          console.log('📺 Processing channel preference response');
          
          // Option 1: OTT/Streaming
          if (lower.match(/^1$|ott|streaming|youtube|video|ctv|connected tv/i)) {
            newBrief.channel_preference = 'OTT';
            console.log('✅ User selected: OTT/Streaming focus');
          }
          // Option 2: Social Media
          else if (lower.match(/^2$|social|facebook|instagram|tiktok|meta/i)) {
            newBrief.channel_preference = 'Social';
            console.log('✅ User selected: Social Media focus');
          }
          // Option 3: Display
          else if (lower.match(/^3$|display|banner|programmatic|news|publisher/i)) {
            newBrief.channel_preference = 'Display';
            console.log('✅ User selected: Display focus');
          }
          // Option 4: Balanced Mix (or default if unclear)
          else if (lower.match(/^4$|balanced|mix|all|optimize|don't know|not sure/i)) {
            newBrief.channel_preference = 'Balanced';
            console.log('✅ User selected: Balanced mix');
          }
          // Default to balanced if unclear
          else {
            newBrief.channel_preference = 'Balanced';
            console.log('⚠️ Unclear response, defaulting to Balanced mix');
          }
          
          setBrief(newBrief);
        }
        
        // 2. CREATIVE ASSET TYPE (affects format unlock)
        const hasVideoMention = lower.match(/video|tvc|tv commercial|youtube|streaming|pre-?roll|mid-?roll|in-?stream/i);
        const hasStaticMention = lower.match(/banner|display|static|image|jpeg|png|mrec/i);
        const hasInteractiveMention = lower.match(/interactive|rich media|playable|carousel/i);
        const hasBothMention = (hasVideoMention && hasStaticMention) || lower.match(/hybrid|mixed|both|video and banner/i);
        
        // NEW: Check for creative build recommendation responses
        const needsCreativeBuild = lower.match(/need.*creative|include.*creative|creative.*build|recommend.*creative|no.*assets?|don'?t have|should.*include/i);
        const hasCreativeAssets = lower.match(/have.*assets?|already.*have|yes.*have|got.*creative|assets?.*ready/i);
        
        // CRITICAL: Creative input MUST change the media plan
        if (hasVideoMention && !newBrief.creative_asset_type) {
          newBrief.creative_asset_type = 'video';
          newBrief._videoAssetConfirmed = true;
          console.log('✅ Video assets confirmed - will prioritize In-stream, Video Everywhere, High-impact video');
          setBrief(newBrief);
        } else if (hasStaticMention && !hasVideoMention && !newBrief.creative_asset_type) {
          newBrief.creative_asset_type = 'static';
          newBrief._staticOnlyConfirmed = true;
          console.log('✅ Static banners only - will prioritize Display formats');
          setBrief(newBrief);
        } else if (hasInteractiveMention && !newBrief.creative_asset_type) {
          newBrief.creative_asset_type = 'interactive';
          console.log('✅ Interactive assets - will unlock rich media units');
          setBrief(newBrief);
        } else if (hasBothMention && !newBrief.creative_asset_type) {
          newBrief.creative_asset_type = 'hybrid';
          console.log('✅ Hybrid assets (video + static) - will propose balanced mix with justification');
          setBrief(newBrief);
        } else if (needsCreativeBuild && !newBrief.creative_asset_type) {
          // User needs creative build - infer type based on objective and add flag
          const isVideoObjective = newBrief.campaign_objective === 'Awareness' || newBrief.campaign_objective === 'VideoView';
          newBrief.creative_asset_type = isVideoObjective ? 'video' : 'static';
          newBrief._needsCreativeBuild = true;
          console.log(`✅ Creative build needed - will recommend ${newBrief.creative_asset_type} creative production`);
          setBrief(newBrief);
        } else if (hasCreativeAssets && !newBrief.creative_asset_type) {
          // User has assets - infer type based on objective
          const isVideoObjective = newBrief.campaign_objective === 'Awareness' || newBrief.campaign_objective === 'VideoView';
          newBrief.creative_asset_type = isVideoObjective ? 'video' : 'static';
          newBrief._videoAssetConfirmed = isVideoObjective;
          newBrief._staticOnlyConfirmed = !isVideoObjective;
          console.log(`✅ Creative assets confirmed - ${newBrief.creative_asset_type} formats ready`);
          setBrief(newBrief);
        } else if (!newBrief.creative_asset_type && !hasVideoMention && !hasStaticMention) {
          // Only ask if it materially affects format selection
          const isVideoObjective = newBrief.campaign_objective === 'Awareness' || newBrief.campaign_objective === 'VideoView';
          const isPremiumIndustry = newBrief.industry === 'Beauty' || newBrief.industry === 'Automotive' || newBrief.industry === 'Property';
          
          if ((isVideoObjective || isPremiumIndustry) && !askedBefore.creative) {
            addMessage('assistant', `Let's tighten this plan. One question:\n\nDo you already have the creative assets, or should I include a creative build recommendation in the plan?`);
            setIsLoading(false);
            return;
          } else {
            // Default based on objective
            newBrief.creative_asset_type = isVideoObjective ? 'video' : 'static';
            console.log('🧠 Inferred creative type:', newBrief.creative_asset_type);
            setBrief(newBrief);
          }
        }
        
        // 3. GEOGRAPHY (affects targeting and budget)
        // First check: Should we ASK about geography?
        const askedGeography = newBrief._meta?.clarificationsAsked?.geography;
        
        console.log('🔍 Geography check:', {
          askedGeography,
          currentGeography: newBrief.geography,
          hasObjective: !!newBrief.campaign_objective,
          hasIndustry: !!newBrief.industry,
          shouldAsk: !askedGeography && (!newBrief.geography || newBrief.geography.length === 0 || newBrief.geography.includes('Malaysia'))
        });
        
        // If not asked yet AND geography is default/not explicitly mentioned, ask now
        if (!askedGeography && (!newBrief.geography || newBrief.geography.length === 0 || newBrief.geography.includes('Malaysia'))) {
          // Only ask if we have objective and industry (budget can come later)
          if (newBrief.campaign_objective && newBrief.industry) {
            console.log('🌍 Asking about geography targeting (before processing)');
            
            const geographyQuestion = `One more thing — where would you like to target?\n\n` +
              `1️⃣ **Nationwide** (all of Malaysia)\n` +
              `2️⃣ **Klang Valley** (Selangor & KL)\n` +
              `3️⃣ **Specific region** (e.g., Penang, Johor, East Malaysia)\n\n` +
              `This affects your reach and targeting strategy.`;
            
            addMessage('assistant', geographyQuestion);
            
            // Mark that we've asked
            newBrief._meta = newBrief._meta || {};
            newBrief._meta.clarificationsAsked = newBrief._meta.clarificationsAsked || {};
            newBrief._meta.clarificationsAsked.geography = true;
            setBrief(newBrief);
            
            setIsLoading(false);
            return; // Stop here, wait for user response
          }
        }
        
        // Second check: Process geography (either from user response or auto-inference)
        if (!newBrief.geography || newBrief.geography.length === 0 || (askedGeography && newBrief.geography.includes('Malaysia'))) {
          // Handle explicit geography responses (if we asked the question)
          if (askedGeography) {
            console.log('🌍 Processing geography response after asking question');
            
            // Option 1: Nationwide
            if (lower.match(/^1$|nationwide|national|all.?malaysia|whole.?malaysia|entire.?malaysia/i)) {
              newBrief.geography = ['Malaysia'];
              console.log('✅ User selected: Nationwide (Malaysia)');
            }
            // Option 2 or 3: Extract ALL mentioned regions
            else {
              const extractedGeography = [];
              
              // === REGIONAL GEOGRAPHY MAPPING (KULT Official Table) ===
              
              // Peninsular Malaysia (all 13 peninsula states)
              if (lower.match(/peninsula|west.?malaysia|semenanjung|mainland.?malaysia/i)) {
                ['Kuala Lumpur', 'Selangor', 'Putrajaya', 'Johor', 'Melaka', 
                 'Negeri Sembilan', 'Penang', 'Kedah', 'Perlis', 'Perak', 
                 'Kelantan', 'Terengganu', 'Pahang'].forEach(s => {
                  if (!extractedGeography.includes(s)) extractedGeography.push(s);
                });
              }
              
              // East Malaysia: Sabah, Sarawak, Labuan
              if (lower.match(/east.?malaysia|borneo|malaysia.?timur|east.?side/i)) {
                if (!extractedGeography.includes('Sabah')) extractedGeography.push('Sabah');
                if (!extractedGeography.includes('Sarawak')) extractedGeography.push('Sarawak');
                if (!extractedGeography.includes('Labuan')) extractedGeography.push('Labuan');
              }
              
              // Central Region / Klang Valley: KL, Selangor, Putrajaya
              if (lower.match(/central|klang.?valley|kv|greater.?kl|urban.?malaysia/i)) {
                if (!extractedGeography.includes('Kuala Lumpur')) extractedGeography.push('Kuala Lumpur');
                if (!extractedGeography.includes('Selangor')) extractedGeography.push('Selangor');
                if (!extractedGeography.includes('Putrajaya')) extractedGeography.push('Putrajaya');
              }
              
              // Northern Region: Penang, Kedah, Perlis, Perak
              if (lower.match(/\bnorth(ern)?\b|utara|penang.?region/i)) {
                if (!extractedGeography.includes('Penang')) extractedGeography.push('Penang');
                if (!extractedGeography.includes('Kedah')) extractedGeography.push('Kedah');
                if (!extractedGeography.includes('Perlis')) extractedGeography.push('Perlis');
                if (!extractedGeography.includes('Perak')) extractedGeography.push('Perak');
              }
              
              // Southern Region: Johor, Melaka, Negeri Sembilan
              if (lower.match(/\bsouth(ern)?\b|jb.?region|singapore.?belt/i)) {
                if (!extractedGeography.includes('Johor')) extractedGeography.push('Johor');
                if (!extractedGeography.includes('Melaka')) extractedGeography.push('Melaka');
                if (!extractedGeography.includes('Negeri Sembilan')) extractedGeography.push('Negeri Sembilan');
              }
              
              // East Coast Region: Kelantan, Terengganu, Pahang
              if (lower.match(/east.?coast|eastern.?coast|pantai.?timur|muslim.?heartland/i)) {
                if (!extractedGeography.includes('Kelantan')) extractedGeography.push('Kelantan');
                if (!extractedGeography.includes('Terengganu')) extractedGeography.push('Terengganu');
                if (!extractedGeography.includes('Pahang')) extractedGeography.push('Pahang');
              }
              
              // Fallback: Check for KL with word boundary
              if (lower.match(/\bkl\b/i)) {
                if (!extractedGeography.includes('Kuala Lumpur')) extractedGeography.push('Kuala Lumpur');
              }
              
              // Check for Penang
              if (lower.match(/penang/i)) {
                if (!extractedGeography.includes('Penang')) extractedGeography.push('Penang');
              }
              
              // Check for Kedah
              if (lower.match(/kedah/i)) {
                if (!extractedGeography.includes('Kedah')) extractedGeography.push('Kedah');
              }
              
              // Check for Johor
              if (lower.match(/johor/i)) {
                if (!extractedGeography.includes('Johor')) extractedGeography.push('Johor');
              }
              
              // Check for Sabah
              if (lower.match(/sabah/i)) {
                if (!extractedGeography.includes('Sabah')) extractedGeography.push('Sabah');
              }
              
              // Check for Sarawak
              if (lower.match(/sarawak/i)) {
                if (!extractedGeography.includes('Sarawak')) extractedGeography.push('Sarawak');
              }
              
              // Check for Melaka/Malacca
              if (lower.match(/melaka|malacca/i)) {
                if (!extractedGeography.includes('Melaka')) extractedGeography.push('Melaka');
              }
              
              // Check for Pahang
              if (lower.match(/pahang/i)) {
                if (!extractedGeography.includes('Pahang')) extractedGeography.push('Pahang');
              }
              
              // Check for Negeri Sembilan
              if (lower.match(/negeri.?sembilan/i)) {
                if (!extractedGeography.includes('Negeri Sembilan')) extractedGeography.push('Negeri Sembilan');
              }
              
              // Check for Perak
              if (lower.match(/perak/i)) {
                if (!extractedGeography.includes('Perak')) extractedGeography.push('Perak');
              }
              
              // Check for Kelantan
              if (lower.match(/kelantan/i)) {
                if (!extractedGeography.includes('Kelantan')) extractedGeography.push('Kelantan');
              }
              
              // Check for Terengganu
              if (lower.match(/terengganu|trengganu/i)) {
                if (!extractedGeography.includes('Terengganu')) extractedGeography.push('Terengganu');
              }
              
              // Check for Perlis
              if (lower.match(/perlis/i)) {
                if (!extractedGeography.includes('Perlis')) extractedGeography.push('Perlis');
              }
              
              if (extractedGeography.length > 0) {
                newBrief.geography = extractedGeography;
                console.log('✅ User selected regions:', extractedGeography.join(', '));
              } else {
                // User said "2" or "3" but didn't specify - ask again
                addMessage('assistant', 'Which specific regions would you like to target? (e.g., Klang Valley, Penang, Johor)');
                setIsLoading(false);
                return;
              }
            }
          }
          // Auto-inference (if we didn't ask the question)
          else {
            // Use word boundaries for 'kl' to avoid false matches
            if (lower.match(/\bkl\b|kuala lumpur|klang valley|selangor/i)) {
              newBrief.geography = ['Selangor', 'Kuala Lumpur'];
            } else if (lower.match(/nationwide|national|malaysia/i)) {
              newBrief.geography = ['Malaysia'];
            } else if (lower.match(/penang|kedah|northern/i)) {
              newBrief.geography = ['Penang', 'Kedah'];
            } else if (lower.match(/johor|southern/i)) {
              newBrief.geography = ['Johor'];
            } else if (lower.match(/sabah|sarawak|east/i)) {
              newBrief.geography = ['Sabah', 'Sarawak'];
            } else {
              newBrief.geography = ['Malaysia']; // Default nationwide, not KL
            }
          }
          
          console.log('🧠 Final geography:', newBrief.geography);
          setBrief(newBrief);
        }
        
        // 4. DURATION (affects pacing)
        // First check: Should we ASK about duration?
        const askedDuration = newBrief._meta?.clarificationsAsked?.duration;
        
        // If not asked yet AND duration is not set, ask now
        if (!askedDuration && !newBrief.duration_weeks) {
          // Only ask if we have objective, industry, and geography (budget can come later)
          if (newBrief.campaign_objective && newBrief.industry && newBrief.geography && newBrief.geography.length > 0) {
            console.log('📅 Asking about campaign duration');
            
            const durationQuestion = `How long will this campaign run?\n\n` +
              `1️⃣ **1 week** (Short burst / Weekend campaign)\n` +
              `2️⃣ **2 weeks** (Festive / Event-based)\n` +
              `3️⃣ **4 weeks** (Standard campaign) ⭐ Recommended\n` +
              `4️⃣ **8+ weeks** (Always-on / Long-term)\n\n` +
              `This affects budget pacing and reach optimization.`;
            
            addMessage('assistant', durationQuestion);
            
            // Mark that we've asked
            newBrief._meta = newBrief._meta || {};
            newBrief._meta.clarificationsAsked = newBrief._meta.clarificationsAsked || {};
            newBrief._meta.clarificationsAsked.duration = true;
            setBrief(newBrief);
            
            setIsLoading(false);
            return; // Stop here, wait for user response
          }
        }
        
        // Second check: Process duration (either from user response or auto-inference)
        if (!newBrief.duration_weeks) {
          // Handle explicit duration responses (if we asked the question)
          if (askedDuration) {
            console.log('📅 Processing duration response after asking question');
            
            // Option 1: 1 week
            if (lower.match(/^1$|1 week|one week|short|burst|weekend/i)) {
              newBrief.duration_weeks = 1;
              console.log('✅ User selected: 1 week (short burst)');
            }
            // Option 2: 2 weeks
            else if (lower.match(/^2$|2 weeks?|two weeks?|festive|event/i)) {
              newBrief.duration_weeks = 2;
              console.log('✅ User selected: 2 weeks (festive/event)');
            }
            // Option 3: 4 weeks (standard)
            else if (lower.match(/^3$|4 weeks?|four weeks?|standard|month/i)) {
              newBrief.duration_weeks = 4;
              console.log('✅ User selected: 4 weeks (standard)');
            }
            // Option 4: 8+ weeks
            else if (lower.match(/^4$|8|eight|long|always.?on|ongoing|continuous/i)) {
              newBrief.duration_weeks = 8;
              console.log('✅ User selected: 8+ weeks (always-on)');
            }
            // If user specified a custom number
            else if (lower.match(/(\d+)\s*weeks?/i)) {
              const weeks = parseInt(lower.match(/(\d+)\s*weeks?/i)[1]);
              newBrief.duration_weeks = weeks;
              console.log(`✅ User selected: ${weeks} weeks (custom)`);
            }
            // Default to standard if unclear
            else {
              newBrief.duration_weeks = 4;
              console.log('⚠️ Unclear response, defaulting to 4 weeks (standard)');
            }
            
            setBrief(newBrief);
          }
          // Auto-inference (if we didn't ask the question)
          else {
            if (lower.match(/1 week|short burst|weekend/i)) {
              newBrief.duration_weeks = 1;
            } else if (lower.match(/2 weeks?/i)) {
              newBrief.duration_weeks = 2;
            } else if (lower.match(/8 weeks?|always.?on/i)) {
              newBrief.duration_weeks = 8;
            } else if (lower.match(/festive|cny|raya/i)) {
              newBrief.duration_weeks = 2;
            } else {
              newBrief.duration_weeks = 4; // Standard
            }
          }
          console.log(`🧠 Inferred duration: ${newBrief.duration_weeks} weeks`);
          setBrief(newBrief);
        }
        
        // 4. BUYING TYPE (affects CPM)
        if (!newBrief.buying_type) {
          newBrief.buying_type = 'Mixed'; // Always default to most efficient
          console.log('🧠 Defaulted to Mixed buying');
          setBrief(newBrief);
        }
      }
      
      // Step 3.5: Handle budget clarification questions
      // If user just saw an inferred budget and asks "why?", explain the reasoning
      if (newBrief._budgetInferred && lower.match(/why|how.*calculate|explain|reasoning|basis|justify/i)) {
        console.log('💬 User asking about budget reasoning');
        
        const budgetInfo = suggestBudget(
          newBrief.campaign_objective,
          newBrief.industry,
          newBrief.geography,
          newBrief.duration_weeks,
          newBrief._seasonalContext,
          newBrief._culturalContext
        );
        
        let explanation = `Here's how I arrived at RM ${newBrief.budget_rm.toLocaleString()}:\n\n`;
        explanation += `**Base Budget:** RM ${budgetInfo.reasoning.base_budget.toLocaleString()}\n`;
        explanation += `• Campaign type: ${newBrief.campaign_objective}\n\n`;
        
        explanation += `**Adjustments:**\n`;
        explanation += `• Industry (${newBrief.industry}): ${budgetInfo.reasoning.industry_multiplier}x\n`;
        explanation += `• Geography (${newBrief.geography.join(', ')}): ${budgetInfo.reasoning.geo_multiplier}x\n`;
        explanation += `• Duration (${newBrief.duration_weeks} weeks): ${budgetInfo.reasoning.duration_multiplier}x\n`;
        
        if (budgetInfo.reasoning.seasonal) {
          explanation += `• Seasonal (${budgetInfo.reasoning.seasonal}): Higher competition during peak season\n`;
        }
        
        explanation += `\n**Final Calculation:**\n`;
        explanation += `RM ${budgetInfo.reasoning.base_budget.toLocaleString()} × ${budgetInfo.reasoning.industry_multiplier} × ${budgetInfo.reasoning.geo_multiplier} × ${budgetInfo.reasoning.duration_multiplier}`;
        if (budgetInfo.reasoning.seasonal) {
          explanation += ` × ${budgetInfo.reasoning.seasonal.match(/\d\.\d/)?.[0] || '1.3'}`;
        }
        explanation += ` = RM ${newBrief.budget_rm.toLocaleString()}\n\n`;
        
        explanation += `This ensures sufficient reach and frequency for a successful ${newBrief.campaign_objective.toLowerCase()} campaign in ${newBrief.industry}.\n\n`;
        explanation += `Ready to proceed with this budget?`;
        
        addMessage('assistant', explanation);
        
        // Clear the _budgetInferred flag so we don't loop
        newBrief._budgetInferred = false;
        newBrief._budgetExplained = true;
        setBrief(newBrief);
        
        setIsLoading(false);
        return;
      }
      
      // Step 4: Generate plan
      if (newBrief.campaign_objective && newBrief.industry && newBrief.budget_rm) {
        console.log('✅ All basic info ready, checking context completeness...');
        
        // === NEW: CHECK CONTEXT BEFORE GENERATING PLAN (Package 3) ===
        const missingContext = validateContextComplete(newBrief);
        
        if (missingContext.length > 0) {
          // Context incomplete - ask the first missing question
          const nextQuestion = missingContext[0];
          console.log('⚠️ Context incomplete, asking for:', nextQuestion.field);
          
          // Mark this question as asked
          setBrief(prev => ({
            ...prev,
            _contextGatheringPhase: 'gathering',
            _contextQuestionsAsked: {
              ...prev._contextQuestionsAsked,
              [nextQuestion.field]: true
            }
          }));
          
          addMessage('assistant', nextQuestion.question);
          setIsLoading(false);
          return;
        }
        
        // === AUDIENCE DILUTION WARNING (Package 3) ===
        if ((newBrief.campaign_objective === 'Awareness' || newBrief.campaign_objective === 'VideoView') && 
            newBrief.selectedPersonas && newBrief.selectedPersonas.length > 5) {
          const warning = `⚠️ **Note on Audience Strategy**\n\nYour plan currently targets ${newBrief.selectedPersonas.length} distinct audiences. For awareness campaigns, this may dilute your frequency and impact.\n\n**Recommendation:** Consider consolidating into 3-5 core personas that best represent your target market. This will allow for:\n• Higher frequency per audience\n• Stronger message consistency\n• More efficient budget allocation\n\nWould you like me to suggest which audiences to prioritize?\n\n---\n\n`;
          
          addMessage('assistant', warning);
          // Continue with plan generation after warning
        }
        
        console.log('✅ Context complete, generating plan');
        
        // Check if datasets are loaded BEFORE calling generateMediaPlan
        // This avoids the React closure issue
        const checkDatasets = () => {
          return datasets.rates.length > 0 && datasets.formats.length > 0;
        };
        
        console.log('📊 Checking datasets availability:', {
          rates: datasets.rates.length,
          formats: datasets.formats.length,
          audiences: datasets.audiences.length,
          sites: datasets.sites.length,
          ready: checkDatasets()
        });
        
        if (!checkDatasets()) {
          // Datasets not loaded yet - wait and retry
          console.log('⏳ Datasets not ready, waiting 3 seconds...');
          addMessage('assistant', 'Loading campaign data... One moment.');
          setTimeout(() => {
            console.log('🔄 Retry - datasets now:', {
              rates: datasets.rates.length,
              formats: datasets.formats.length,
              ready: datasets.rates.length > 0 && datasets.formats.length > 0
            });
            
            if (datasets.rates.length > 0 && datasets.formats.length > 0) {
              const retryPlan = generateMediaPlan(newBrief);
              if (retryPlan) {
                setRecommendations(retryPlan);
                showMediaPlan(retryPlan);
              }
            } else {
              addMessage('assistant', 'Sorry, there was an error loading the campaign data. Please refresh the page.');
            }
            setIsLoading(false);
          }, 3000);
          return;
        }
        
        console.log('[TARGET] Final brief for plan generation:', {
          objective: newBrief.campaign_objective,
          industry: newBrief.industry,
          budget: newBrief.budget_rm,
          seasonalContext: newBrief._seasonalContext || newBrief.seasonalContext,
          culturalContext: newBrief._culturalContext || newBrief.culturalContext,
          productContext: newBrief._productContext?.attributes
        });
        
        const plan = generateMediaPlan(newBrief);
        console.log('📋 Plan generated:', plan ? 'Success' : 'Failed (null)');
        
        // VALIDATION: Ensure plan meets requirements
        if (plan) {
          const validation = {
            hasAudiences: plan.audiences && plan.audiences.length > 0,
            hasReach: plan.summary && plan.summary.estimatedReach > 0,
            hasBudget: plan.summary && plan.summary.totalBudget > 0,
            matchesBudget: plan.summary && Math.abs(plan.summary.totalBudget - newBrief.budget_rm) < 1000,
            hasMultiplePillars: plan.lineItems && new Set(plan.lineItems.map(i => i.pillar)).size > 1
          };
          
          console.log('✅ Plan validation:', validation);
          
          // Check for critical failures
          if (!validation.hasAudiences || !validation.hasReach) {
            console.error('❌ Plan validation failed: Missing audiences or reach');
            addMessage('assistant', 'I am having trouble generating a complete plan. Let me try with different parameters...');
            setIsLoading(false);
            return;
          }
          
          // Add context about inferred values
          let context = '';
          if (newBrief._budgetInferred) {
            context = `Based on typical ${newBrief.industry} campaigns, I'm recommending RM ${newBrief.budget_rm.toLocaleString()}.\n\n`;
          }
          
          if (context) {
            addMessage('assistant', context);
          }
          
          setRecommendations(plan);
          showMediaPlan(plan);
          
          // Auto-save campaign as draft when recommendations are generated
          setTimeout(async () => {
            try {
              const campaignId = await handleSaveCampaign(true);
              if (campaignId) {
                console.log('✅ Auto-saved campaign:', campaignId);
              }
            } catch (error) {
              console.error('❌ Auto-save failed:', error);
            }
          }, 1000);
        } else {
          console.error('❌ Plan generation returned null');
          addMessage('assistant', 'I encountered an issue generating the plan. Please try rephrasing your requirements.');
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    }, 800);
  };

  // === SHOW MEDIA PLAN ===
  const showMediaPlan = (plan) => {
    console.log('🎬 showMediaPlan called with plan:', plan ? 'exists' : 'null');
    const { brief: req, formats, audiences, sites, lineItems, summary } = plan;
    console.log('📦 Destructured plan components:', { req: !!req, formats: formats?.length, audiences: audiences?.length, sites: sites?.length, lineItems: lineItems?.length, summary: !!summary });

    console.log('🔨 Building assumptions...');
    // Build assumptions
    const assumptions = [];
    if (req.geography.includes('Selangor') && req.geography.includes('Kuala Lumpur')) {
      assumptions.push('Klang Valley targeting');
    }
    if (req.buying_type === 'Mixed') {
      assumptions.push('Mixed buying for best value');
    }
    // Only show duration assumption if it was actually defaulted to 4 weeks
    if (req.duration_weeks === 4 && !brief._meta?.clarificationsAsked?.duration) {
      assumptions.push('4-week standard duration');
    }
    // Seasonal/cultural context assumptions
    if (req._seasonalContext) {
      const seasonName = {
        'cny': 'Chinese New Year',
        'raya': 'Hari Raya',
        'deepavali': 'Deepavali',
        'gawai': 'Gawai',
        'valentines': "Valentine's Day",
        'mothers_day': "Mother's Day",
        'festive_general': 'Festive Season'
      }[req._seasonalContext] || req._seasonalContext;
      assumptions.push(`Seasonal campaign optimized for ${seasonName}`);
    }
    if (req._culturalContext) {
      assumptions.push(`Cultural targeting with vernacular publisher prioritization`);
    }
    if (req._budgetQualifier) {
      assumptions.push(`${req._budgetQualifier} budget interpreted as RM ${req.budget_rm.toLocaleString()}`);
    }
    if (req._budgetSuggested) {
      assumptions.push(`Budget suggested based on campaign parameters`);
    }
    if (req.channel_preference && req.channel_preference !== 'Balanced') {
      const channelName = {
        'OTT': 'OTT/Streaming',
        'Social': 'Social Media',
        'Display': 'Display'
      }[req.channel_preference] || req.channel_preference;
      assumptions.push(`Focused on ${channelName} channels as requested`);
    }

    console.log('✅ Assumptions built:', assumptions.length);

    // CONTEXT-AWARE & PLAYBOOK-BASED strategic reasoning
    console.log('🔨 Building strategy reasoning...');
    let strategy = '';
    
    // Check for seasonal/cultural/product context
    const seasonalContext = req._seasonalContext;
    const culturalContext = req._culturalContext;
    const productContext = req._productContext;
    console.log('📊 Context check:', { 
      seasonalContext, 
      culturalContext, 
      hasProductContext: !!productContext,
      productAttributes: productContext?.attributes || [],
      contextPersonas: productContext?.personas?.slice(0, 3) || []
    });
    
    // PRIORITY: Seasonal/Cultural reasoning overrides standard playbook
    if (seasonalContext || culturalContext) {
      const bullets = [];
      
      // Seasonal context explanation
      if (seasonalContext) {
        const seasonalMap = {
          'cny': 'Chinese New Year',
          'raya': 'Hari Raya',
          'deepavali': 'Deepavali',
          'gawai': 'Gawai',
          'valentines': "Valentine's Day",
          'mothers_day': "Mother's Day",
          'festive_general': 'Festive Season'
        };
        const seasonName = seasonalMap[seasonalContext] || seasonalContext;
        bullets.push(`**Seasonal Campaign (${seasonName})**: This plan adapts to ${seasonName} gifting behavior, premium festive formats, and heightened consumer spending patterns.`);
      }
      
      // Cultural targeting
      if (culturalContext) {
        const culturalMap = {
          'malay': 'Malay/Muslim community with family-centric content and vernacular publishers',
          'chinese': 'Chinese community with festive content and culturally relevant placements',
          'indian': 'Indian community with celebration-focused messaging',
          'sabah_sarawak': 'Sabah & Sarawak communities with regional cultural relevance'
        };
        bullets.push(`**Cultural Targeting**: Prioritizing ${culturalMap[culturalContext] || culturalContext} to match campaign context.`);
      }
      
      // Persona adaptation
      bullets.push(`**Audience Adaptation**: Selected personas reflect ${seasonalContext ? 'seasonal gifting intent' : 'cultural affinity'} and ${culturalContext ? 'vernacular preferences' : 'festive behavior'}, not generic category targeting.`);
      
      // Format adaptation
      bullets.push(`**Premium Festive Formats**: Using high-impact, OTT premium content, and culturally resonant placements—avoiding generic display-only approaches for seasonal moments.`);
      
      // Platform/site prioritization
      if (culturalContext) {
        const culturalSiteMap = {
          'malay': 'Malay vernacular publishers (Utusan, Berita Harian, Sinar)',
          'chinese': 'Chinese-language publishers (Sin Chew, Nanyang, Oriental Daily)',
          'indian': 'Tamil/Indian publishers (Malaysia Nanban, Makkal Osai)',
          'sabah_sarawak': 'East Malaysia regional publishers'
        };
        bullets.push(`**Platform Mix Override**: Prioritized ${culturalSiteMap[culturalContext] || 'culturally relevant publishers'} over generic high-traffic sites for authentic cultural resonance.`);
      }
      
      // Budget adjustment rationale
      if (seasonalContext) {
        const premiumExplanation = ['cny', 'raya', 'deepavali'].includes(seasonalContext) 
          ? 'Major festive season commands premium placements with higher CPMs (+50% budget adjustment)'
          : 'Seasonal campaign requires premium placements (+30% budget adjustment)';
        bullets.push(`**Budget Adjustment**: ${premiumExplanation} due to increased competition and need for share-of-voice during peak periods.`);
      }
      
      strategy = bullets.join('\n\n');
    }
    // FALLBACK: Product context reasoning (halal, premium, health, etc.)
    else if (productContext && productContext.attributes && productContext.attributes.length > 0) {
      console.log('📊 Using product context strategy, attributes:', productContext.attributes);
      const bullets = [];
      
      console.log('🔨 Checking product attributes...');
      if (productContext.attributes.includes('halal')) {
        console.log('  ✅ Adding halal strategy');
        bullets.push(`**Halal Product Strategy**: This plan prioritizes Malay/Muslim audiences with family-centric messaging and culturally appropriate placements.`);
      }
      if (productContext.attributes.includes('health')) {
        console.log('  ✅ Adding health strategy');
        bullets.push(`**Health & Wellness Positioning**: Targeting health-conscious, active lifestyle personas with wellness-focused content environments.`);
      }
      if (productContext.attributes.includes('premium')) {
        console.log('  ✅ Adding premium strategy');
        bullets.push(`**Premium Brand Strategy**: High-income personas (T20, Luxury Seekers) with premium formats and aspirational placements—avoiding mass-market environments.`);
      }
      if (productContext.attributes.includes('new_brand')) {
        console.log('  ✅ Adding new_brand strategy');
        bullets.push(`**New Brand Launch**: Awareness-first strategy with high reach, frequency, and brand-building formats to establish market presence.`);
      }
      
      console.log('🔨 Adding context-matched audiences line...');
      bullets.push(`**Context-Matched Audiences**: Selected personas based on product attributes (${productContext.attributes.join(', ')}), not generic category defaults.`);
      
      console.log('🔨 Joining bullets..., count:', bullets.length);
      strategy = bullets.join('\n\n');
      console.log('✅ Product context strategy complete, length:', strategy.length);
    }
    // STANDARD: Vertical playbook reasoning
    else {
      console.log('📊 Using standard playbook strategy');
      console.log('📊 Product context check:', { 
        hasProductContext: !!productContext, 
        hasAttributes: productContext?.attributes,
        attributesLength: productContext?.attributes?.length 
      });
      const verticalKey = req._vertical_key || findVerticalFromText(req.industry);
      const verticalConfig = getVerticalConfig(verticalKey || req.industry);
      
      if (verticalConfig) {
        // Use playbook strategy_dna and market_truths for reasoning
        const bullets = [];
        
        // 1. Strategy DNA
        bullets.push(`**${verticalConfig.strategy_dna}**: This plan follows the proven ${verticalConfig.label} playbook.`);
        
        // 2. Market truth
        if (verticalConfig.market_truths && verticalConfig.market_truths.length > 0) {
          bullets.push(`**Market context**: ${verticalConfig.market_truths[0]}`);
        }
        
        // 3. Funnel priority
        const funnelStage = getFunnelStage(req.campaign_objective);
        const funnelFormats = verticalConfig.funnel[funnelStage] || [];
        if (funnelFormats.length > 0) {
          bullets.push(`**Funnel stage (${funnelStage})**: I prioritized ${funnelFormats.slice(0, 2).map(f => f.replace(/_/g, ' ')).join(', ')} based on your ${req.campaign_objective} objective.`);
        }
        
        // 4. Format strategy
        if (verticalConfig.creative_requirements?.best_formats) {
          const bestFormats = verticalConfig.creative_requirements.best_formats.slice(0, 3).map(f => f.replace(/_/g, ' ')).join(', ');
          bullets.push(`**Format mix**: Using ${bestFormats} optimized for ${verticalConfig.label} campaigns.`);
        }
        
        // 5. KPI alignment
        if (verticalConfig.kpi?.main_kpi) {
          bullets.push(`**Success metric**: This plan optimizes for ${verticalConfig.kpi.main_kpi.replace(/_/g, ' ')}—the key KPI for ${verticalConfig.label}.`);
        }
        
        strategy = bullets.join('\n\n');
      } else {
        // Fallback to priority-based reasoning
        if (req.priority === 'Max Reach') {
          strategy = `I prioritized low-CPM placements to maximize your reach. This plan delivers ${summary.totalImpressions.toLocaleString()} impressions across ${summary.estimatedReach.toLocaleString()} people—strong volume for ${req.campaign_objective.toLowerCase()}.`;
        } else if (req.priority === 'Performance') {
          strategy = `I focused on premium, high-engagement formats. Higher CPM means better placement quality—ideal for driving ${req.campaign_objective.toLowerCase()} results.`;
        } else {
          strategy = `Balanced approach across ${lineItems.length} platforms spreads risk while maintaining solid reach (${summary.estimatedReach.toLocaleString()} people).`;
        }
      }
    }
    
    console.log('✅ Strategy built, length:', strategy.length);

    console.log('🔨 Building response message...');
    console.log('📊 Summary check:', { totalBudget: summary?.totalBudget, durationWeeks: summary?.durationWeeks, weeklyBudget: summary?.weeklyBudget });
    console.log('📊 Request check:', { product_brand: req?.product_brand, campaign_objective: req?.campaign_objective, industry: req?.industry });
    
    const response = `## ✅ Media Plan Ready

### Campaign Strategy
${req.product_brand ? `Product/Brand: ${req.product_brand}` : ''}
Objective: ${req.campaign_objective}
Industry: ${req.industry}
Budget: RM ${summary.totalBudget.toLocaleString()}
Duration: ${summary.durationWeeks} weeks (RM ${summary.weeklyBudget.toLocaleString()}/week)
Geography: ${summary.geography}
Devices: ${summary.devices}

${assumptions.length > 0 ? `Assumptions I made:
${assumptions.map(a => `• ${a}`).join('\n')}
` : ''}

---

### Budget Allocation (${lineItems.length} line items)

${lineItems.map((item, idx) => `${idx + 1}. ${item.platform} (${item.pillar})
• Budget: RM ${item.budget.toLocaleString('en-US', { maximumFractionDigits: 0 })} | ${item.buyType}
• CPM: RM ${item.cpm.toFixed(2)}
• Impressions: ${item.impressions.toLocaleString()}`).join('\n\n')}

---

### Recommended Formats (${formats.length})
${formats.map(f => {
  const confidence = f.confidence ? ` (${f.confidence}% confidence)` : '';
  const goal = f.goal ? ` — ${f.goal}` : '';
  const reason = f.reason ? `\n  *Why: ${f.reason}*` : '';
  return `• ${f.name}${confidence}${goal}${reason}`;
}).join('\n')}

### Target Audiences (${audiences.length})
${audiences.map(a => {
  const name = a.persona || a.name || 'Unknown Audience';
  const reach = (a.totalAudience || 0).toLocaleString();
  const interests = a.interests && Array.isArray(a.interests) && a.interests.length > 0 
    ? ` (${a.interests.filter(i => i).slice(0, 2).join(', ')})` 
    : '';
  return `• ${name} — ${reach} reach${interests}`;
}).join('\n')}

💾 **Save this audience group for future campaigns?**
*Click "Save Audience Group" below to reuse these ${audiences.length} personas in future plans.*

### Recommended Sites (${sites.length})
${sites.slice(0, 10).map(s => {
  const name = s.siteName || s.name || s.Property || 'Unknown Site';
  const category = s.category ? ` (${s.category})` : '';
  const traffic = (s.monthlyTraffic || s['Total impressions'] || 0).toLocaleString();
  const confidence = s.confidence ? ` — ${s.confidence}% match` : '';
  const reason = s.reason ? `\n  *Why: ${s.reason}*` : '';
  return `• ${name}${category} — ${traffic} visits/mo${confidence}${reason}`;
}).join('\n')}

---

${(() => {
  if (!plan.optimizationStrategy) return '';
  
  const opt = plan.optimizationStrategy;
  return `### [TARGET] Optimization Strategy

**${opt.approach}**

${opt.tactics.map(t => `• ${t}`).join('\n')}

${opt.pacing ? `**Pacing:** ${opt.pacing}` : ''}
${opt.creativeNotes ? `\n**Creative:** ${opt.creativeNotes}` : ''}
`;
})()}

---

### Expected Results

Total Campaign:
• Impressions: ${summary.totalImpressions.toLocaleString()}
• Reach: ${summary.estimatedReach.toLocaleString()} people
• Avg CPM: RM ${summary.avgCPM.toFixed(2)}

Weekly Pacing:
• Budget: RM ${summary.weeklyBudget.toLocaleString()}/week
• Impressions: ${summary.weeklyImpressions.toLocaleString()}/week

${(() => {
  // Get vertical-specific performance benchmarks
  const benchmarkVerticalKey = req._vertical_key || findVerticalFromText(req.industry);
  const benchmarks = verticalPlaybook.performance_benchmarks?.[benchmarkVerticalKey];
  
  if (!benchmarks) return '';
  
  // Map objective to benchmark category
  let benchmarkCategory = '';
  if (req.campaign_objective === 'Awareness' || req.campaign_objective === 'VideoView') {
    benchmarkCategory = 'awareness';
  } else if (req.campaign_objective === 'LeadGen') {
    benchmarkCategory = 'leads';
  } else if (req.campaign_objective === 'Traffic') {
    benchmarkCategory = benchmarks.traffic ? 'traffic' : (benchmarks.sales ? 'sales' : 'awareness');
  } else if (req.campaign_objective === 'Conversion') {
    benchmarkCategory = benchmarks.sales ? 'sales' : (benchmarks.acquisition ? 'acquisition' : 'leads');
  }
  
  const categoryBenchmarks = benchmarks[benchmarkCategory];
  if (!categoryBenchmarks) return '';
  
  // Calculate persona-adjusted performance modifiers
  const personaModifiers = verticalPlaybook.persona_performance_modifiers;
  let avgCtrMod = 1.0, avgVtrMod = 1.0, avgLeadMod = 1.0;
  let modifierCount = 0;
  let modifierPersonas = [];
  
  if (personaModifiers && audiences && audiences.length > 0) {
    audiences.forEach(a => {
      const personaName = a.persona || a.name || '';
      // Try exact match first
      let modifier = personaModifiers[personaName];
      
      // If no exact match, try partial match (e.g., "Young Working Adult" in persona name)
      if (!modifier) {
        for (const [key, mod] of Object.entries(personaModifiers)) {
          if (personaName.includes(key) || key.includes(personaName)) {
            modifier = mod;
            break;
          }
        }
      }
      
      if (modifier) {
        avgCtrMod += modifier.ctr_multiplier || 1.0;
        avgVtrMod += modifier.vtr_multiplier || 1.0;
        avgLeadMod += modifier.lead_rate_multiplier || 1.0;
        modifierCount++;
        modifierPersonas.push(personaName);
      }
    });
    
    if (modifierCount > 0) {
      avgCtrMod = avgCtrMod / (modifierCount + 1); // Average including base 1.0
      avgVtrMod = avgVtrMod / (modifierCount + 1);
      avgLeadMod = avgLeadMod / (modifierCount + 1);
    }
  }
  
  const hasModifiers = modifierCount > 0;
  
  // Build benchmark display with persona adjustments
  const benchmarkLines = [];
  Object.entries(categoryBenchmarks).forEach(([formatType, metrics]) => {
    const formatLabel = formatType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const metricsList = [];
    
    if (metrics.avg_cpm_rm) metricsList.push(`CPM: RM ${metrics.avg_cpm_rm}`);
    
    // Apply persona modifiers to CTR
    if (metrics.expected_ctr) {
      const adjustedCtr = metrics.expected_ctr * avgCtrMod;
      const ctrDisplay = hasModifiers 
        ? `CTR: ${(adjustedCtr * 100).toFixed(2)}%${avgCtrMod !== 1.0 ? ' *' : ''}`
        : `CTR: ${(metrics.expected_ctr * 100).toFixed(2)}%`;
      metricsList.push(ctrDisplay);
    }
    
    // Apply persona modifiers to VTR
    if (metrics.expected_vtr) {
      const adjustedVtr = metrics.expected_vtr * avgVtrMod;
      const vtrDisplay = hasModifiers
        ? `VTR: ${(adjustedVtr * 100).toFixed(0)}%${avgVtrMod !== 1.0 ? ' *' : ''}`
        : `VTR: ${(metrics.expected_vtr * 100).toFixed(0)}%`;
      metricsList.push(vtrDisplay);
    }
    
    // Apply persona modifiers to Lead Rate
    if (metrics.click_to_lead_rate) {
      const adjustedLeadRate = metrics.click_to_lead_rate * avgLeadMod;
      const leadDisplay = hasModifiers
        ? `Lead Rate: ${(adjustedLeadRate * 100).toFixed(0)}%${avgLeadMod !== 1.0 ? ' *' : ''}`
        : `Lead Rate: ${(metrics.click_to_lead_rate * 100).toFixed(0)}%`;
      metricsList.push(leadDisplay);
    }
    
    if (metrics.click_to_purchase_rate) metricsList.push(`Purchase Rate: ${(metrics.click_to_purchase_rate * 100).toFixed(1)}%`);
    if (metrics.click_to_signup_rate) metricsList.push(`Signup Rate: ${(metrics.click_to_signup_rate * 100).toFixed(0)}%`);
    if (metrics.click_to_booking_rate) metricsList.push(`Booking Rate: ${(metrics.click_to_booking_rate * 100).toFixed(0)}%`);
    if (metrics.click_to_booking_engine_rate) metricsList.push(`To Booking: ${(metrics.click_to_booking_engine_rate * 100).toFixed(0)}%`);
    if (metrics.click_to_order_rate) metricsList.push(`Order Rate: ${(metrics.click_to_order_rate * 100).toFixed(0)}%`);
    if (metrics.target_cpl_rm) metricsList.push(`Target CPL: RM ${metrics.target_cpl_rm}`);
    if (metrics.target_cpa_rm) metricsList.push(`Target CPA: RM ${metrics.target_cpa_rm}`);
    if (metrics.target_cpc_rm) metricsList.push(`Target CPC: RM ${metrics.target_cpc_rm.toFixed(2)}`);
    
    if (metricsList.length > 0) {
      benchmarkLines.push(`• **${formatLabel}**: ${metricsList.join(' | ')}`);
    }
  });
  
  if (benchmarkLines.length === 0) return '';
  
  const personaNote = hasModifiers 
    ? `\n\n* *Adjusted for audience: ${modifierPersonas.slice(0, 2).join(', ')}${modifierPersonas.length > 2 ? ', ...' : ''}*`
    : '';
  
  return `
---

### Performance Benchmarks (${req.industry})

Industry standard metrics for ${req.campaign_objective} campaigns:

${benchmarkLines.join('\n')}${personaNote}

*These benchmarks help set realistic expectations and optimize towards industry standards.*
`;
})()}

---

### Why This Works

${strategy}

${req._needsCreativeBuild ? `
---

### 📹 Creative Build Recommendation

Since you need creative assets, I recommend including **${req.creative_asset_type === 'video' ? 'video' : 'static banner'}** production in your plan:

${req.creative_asset_type === 'video' ? `**Video Production Package:**
• 1x Hero Video (30s) for awareness campaigns
• 2x Cut-downs (15s, 6s) for retargeting
• Platform optimization (16:9, 9:16, 1:1 formats)
• Creative testing variations (3-5 different hooks)

**Estimated Production Cost:** RM 15,000 - RM 30,000
**Timeline:** 3-4 weeks (concept → delivery)

This ensures your media budget is supported by high-performing creative that drives results.` : `**Static Banner Production Package:**
• 6-8 banner formats (Leaderboard, MREC, Mobile, etc.)
• A/B testing variations (different CTAs, visuals)
• Platform-specific adaptations
• Responsive design for all devices

**Estimated Production Cost:** RM 5,000 - RM 12,000
**Timeline:** 1-2 weeks (concept → delivery)

This ensures your display formats are optimized for performance across all platforms.`}
` : ''}

${(() => {
  // Add Budget Tier Strategy Information
  const { budgetTier, tierStrategy, tierWarnings } = plan;
  if (!budgetTier || !tierStrategy) return '';
  
  const tierDisplay = {
    low: { emoji: '[TARGET]', name: 'Focused', color: 'blue' },
    mid: { emoji: '[BALANCE]', name: 'Balanced', color: 'green' },
    high: { emoji: '[PREMIUM]', name: 'Premium', color: 'purple' }
  };
  
  const tier = tierDisplay[budgetTier] || tierDisplay.mid;
  
  let tierInfo = `---

### [BUDGET] Budget Strategy: ${tier.emoji} ${tier.name} Tier

**Strategy:** ${tierStrategy.name}
**Approach:** ${tierStrategy.focusStrategy}
**Platforms:** Up to ${tierStrategy.maxPlatforms} channels
**Target Audiences:** Up to ${tierStrategy.audienceLimit} personas

`;

  // Add tier warnings if any
  if (tierWarnings && tierWarnings.length > 0) {
    tierInfo += `
**⚠️ Strategic Considerations:**
${tierWarnings.map(w => `• ${w}`).join('\n')}
`;
  }
  
  return tierInfo;
})()}

${(() => {
  // Add Inventory Validation Information
  const { inventoryValidation } = plan;
  if (!inventoryValidation) return '';
  
  const { valid, severity, message, details } = inventoryValidation;
  
  if (valid && !severity) return ''; // No issues
  
  let invInfo = `---

### 📊 Inventory Status

`;

  if (!valid) {
    invInfo += `**🔴 CRITICAL:** ${message}

`;
    if (details) {
      if (details.requestedImpressions) {
        invInfo += `• **Requested:** ${details.requestedImpressions.toLocaleString()} impressions
`;
      }
      if (details.availableImpressions) {
        invInfo += `• **Available:** ${details.availableImpressions.toLocaleString()} impressions
`;
      }
      if (details.shortfall) {
        invInfo += `• **Shortfall:** ${details.shortfall.toLocaleString()} impressions (${((details.shortfall / details.requestedImpressions) * 100).toFixed(0)}%)
`;
      }
    }
    invInfo += `
**Recommendation:** Consider extending campaign duration, reducing target impressions, or expanding to additional channels.
`;
  } else if (severity === 'warning') {
    invInfo += `**⚠️ WARNING:** ${message}
`;
    if (details && details.utilizationPercent) {
      invInfo += `• **Inventory utilization:** ${details.utilizationPercent.toFixed(0)}%
`;
    }
    invInfo += `
**Recommendation:** This plan uses a significant portion of available inventory. Consider booking early or having backup channels.
`;
  } else if (severity === 'info') {
    invInfo += `**ℹ️ NOTICE:** ${message}
`;
  }
  
  return invInfo;
})()}

${(() => {
  // Add Unique Reach Information
  const { summary } = plan;
  if (!summary || !summary.uniqueReach || !summary.simpleReachSum) return '';
  
  const overlapPercent = ((summary.simpleReachSum - summary.uniqueReach) / summary.simpleReachSum * 100);
  
  if (overlapPercent < 5) return ''; // Not significant enough to mention
  
  return `---

### 👥 Audience Reach Analysis

**Simple Sum:** ${summary.simpleReachSum.toLocaleString()} people
**Unique Reach:** ${summary.uniqueReach.toLocaleString()} people
**Audience Overlap:** ~${overlapPercent.toFixed(0)}%

*The unique reach accounts for overlap between your target audiences, giving you a more accurate estimate of actual people reached.*

`;
})()}

Need adjustments? Just tell me what you'd like to change.`;

    console.log('📨 About to send plan message, response length:', response.length);
    addMessage('assistant', response, plan);
    console.log('✅ Plan message sent successfully');
  };  // closes showMediaPlan

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageWithOpenAI();
    }
  };

  // === AUTO-SAVE CAMPAIGN TO DATABASE ===
  // Action button handlers for AI finalized plans
  const handleSaveDraft = async () => {
    try {
      addMessage('assistant', 'Saving your campaign as a draft...');
      const result = await handleSaveCampaign(true); // isDraft = true
      if (result) {
        addMessage('assistant', 'Campaign saved as draft successfully! You can find it in your campaigns list.');
      }
    } catch (error) {
      console.error('[SAVE DRAFT ERROR]', error);
      addMessage('assistant', 'Sorry, there was an error saving the draft. Please try again.');
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!recommendations || !recommendations.brief) {
        addMessage('assistant', 'Cannot export: Campaign plan is incomplete.');
        return;
      }

      addMessage('assistant', 'Generating Excel file...');
      
      // Prepare payload for export API
      const payload = {
        campaignPlan: {
          campaignName: recommendations.brief.product_brand || recommendations.brief.campaignName || 'Campaign Plan',
          ...recommendations.brief
        },
        budgetChannels: recommendations.channels || [],
        availableSites: datasets.sites || []
      };

      const response = await axios.post('/api/export/kult-template', payload, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KULT_MediaPlan_${payload.campaignPlan.campaignName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addMessage('assistant', 'Excel file downloaded! Check your downloads folder.');
    } catch (error) {
      console.error('[EXPORT EXCEL ERROR]', error);
      addMessage('assistant', 'Sorry, there was an error generating the Excel file. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    try {
      if (!recommendations || !recommendations.brief) {
        addMessage('assistant', 'Cannot export: Campaign plan is incomplete.');
        return;
      }

      addMessage('assistant', 'Generating PDF file...');
      
      // Prepare payload for export API
      const payload = {
        campaignPlan: {
          campaignName: recommendations.brief.product_brand || recommendations.brief.campaignName || 'Campaign Plan',
          ...recommendations.brief
        },
        budgetChannels: recommendations.channels || [],
        availableSites: datasets.sites || []
      };

      const response = await axios.post('/api/export/kult-template-pdf', payload, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KULT_MediaPlan_${payload.campaignPlan.campaignName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addMessage('assistant', 'PDF file downloaded! Check your downloads folder.');
    } catch (error) {
      console.error('[EXPORT PDF ERROR]', error);
      addMessage('assistant', 'Sorry, there was an error generating the PDF file. Please try again.');
    }
  };

  const handleSaveCampaign = async (isDraft = true) => {
    if (!recommendations) {
      addMessage('assistant', 'No plan to save yet. Let me generate recommendations first!');
      return null;
    }
    
    try {
      // Convert AI wizard data to Campaign Wizard format
      const campaignPlan = {
        // Basic Info (Step 1)
        campaignName: `${recommendations.brief.product_brand || recommendations.brief.industry || 'Campaign'} - ${recommendations.brief.campaign_objective || 'Awareness'}`,
        brandProduct: recommendations.brief.product_brand || '',
        objective: recommendations.brief.campaign_objective || 'Awareness',
        industry: recommendations.brief.industry || '',
        totalBudget: recommendations.brief.budget_rm || 0,
        
        // Dates
        startDate: new Date().toISOString().split('T')[0], // Today
        endDate: recommendations.brief.duration_weeks 
          ? new Date(Date.now() + recommendations.brief.duration_weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        
        // Audiences (Step 2)
        selectedPersonas: recommendations.audiences?.map(a => a.name) || [],
        
        // Formats (Step 3) - Extract from recommendations
        selectedFormats: recommendations.formats || [],
        
        // Sites - Extract from channel recommendations
        selectedSites: [],
        
        // Geography & Devices
        geography: Array.isArray(recommendations.brief.geography) 
          ? recommendations.brief.geography 
          : (recommendations.brief.geography ? [recommendations.brief.geography] : ['Malaysia']),
        devices: recommendations.brief.devices || ['Desktop', 'Mobile'],
        
        // Optimization
        optimisedGroups: [],
        
        // Metadata
        createdBy: 'AI Wizard',
        source: 'ai_wizard',
        aiGenerated: true,
        currentStep: 5 // Completed
      };
      
      // Budget Channels (Step 4)
      const budgetChannels = [];
      if (recommendations.channels) {
        recommendations.channels.forEach((channel, idx) => {
          budgetChannels.push({
            id: `channel_${idx}`,
            name: channel.name || channel.channel || 'Channel',
            budget: channel.budget || 0,
            cpm: channel.cpm || 15,
            baseCpm: channel.cpm || 15,
            baseBudget: channel.budget || 0,
            impressions: channel.impressions || 0,
            weight: channel.weight || 0,
            hasLoading: false,
            color: idx === 0 ? 'from-green-500' : idx === 1 ? 'from-blue-500' : 'from-purple-500'
          });
        });
      }
      
      // Save to database
      const payload = {
        campaignPlan,
        budgetChannels,
        status: isDraft ? 'draft' : 'booked'
      };
      
      const response = await axios.post('/api/campaigns', payload);
      
      if (response.data.success) {
        const savedCampaign = response.data.campaign;
        console.log('✅ Campaign auto-saved:', savedCampaign.id);
        
        // Also save to localStorage for backward compatibility
        const plan = {
          id: savedCampaign.id,
          name: campaignPlan.campaignName,
          brief: recommendations.brief,
          recommendations: recommendations,
          createdAt: new Date().toISOString()
        };
        const existingPlans = JSON.parse(localStorage.getItem('aiCampaignPlans') || '[]');
        existingPlans.push(plan);
        localStorage.setItem('aiCampaignPlans', JSON.stringify(existingPlans));
        
        return savedCampaign.id;
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // Fallback to localStorage only
      const plan = {
        name: `AI Plan - ${recommendations.brief.product_brand || recommendations.brief.industry} ${recommendations.brief.campaign_objective} - ${new Date().toLocaleDateString()}`,
        brief: recommendations.brief,
        recommendations: recommendations,
        createdAt: new Date().toISOString()
      };
      const existingPlans = JSON.parse(localStorage.getItem('aiCampaignPlans') || '[]');
      existingPlans.push(plan);
      localStorage.setItem('aiCampaignPlans', JSON.stringify(existingPlans));
      return null;
    }
  };

  const handleExportPlan = async () => {
    if (!recommendations) return;
    
    const campaignId = await handleSaveCampaign(true);
    
    if (campaignId) {
      addMessage('assistant', `Campaign saved as draft! You can view it in Campaign Plans or continue to Book Now. Campaign ID: ${campaignId}`);
    } else {
      addMessage('assistant', 'Plan exported to local storage. Need another plan or want to refine this one?');
    }
  };

  const handleStopAI = () => {
    console.log('[AI WIZARD] Stopping AI request...');
    cancelAIRequest();
    setIsLoading(false);
    pendingRequestRef.current = false;
    addMessage('assistant', 'Request stopped. Feel free to ask me anything else!');
  };

  const handleStartNew = () => {
    // Confirm before clearing if there's content
    if (messages.length > 1 || recommendations) {
      setShowClearConfirmModal(true);
      return;
    }

    // If no content, clear immediately
    clearAllData();
  };

  const clearAllData = () => {
    console.log('[AI WIZARD] Clearing all data and starting fresh');
    
    setMessages([]);
    setBrief({
      product_brand: null,
      campaign_objective: null,
      industry: null,
      budget_rm: null,
      geography: [],
      audience: null,
      duration_weeks: null,
      devices: [],
      buying_type: null,
      priority: null,
      _extractionLog: [],
      _budgetAsked: false,
      _needsBudgetSuggestion: false,
      _budgetSuggested: false,
      _showingTiers: false
    });
    setRecommendations(null);
    setEditingIndex(null);
    setInputMessage('');
    
    // Reset persona constraints too
    setPersonaConstraints({
      blacklist: [],
      whitelist: []
    });
    
    addMessage('assistant', `Fresh start! Let's create something amazing. What are you working on?`);
  };

  // === NEW: SAVE AUDIENCE GROUP ===
  const handleSaveAudienceGroup = () => {
    if (!recommendations || !recommendations.audiences || recommendations.audiences.length === 0) {
      addMessage('assistant', 'No audiences to save. Please generate a plan first.');
      return;
    }
    
    // Auto-generate name from brief
    const autoName = `${recommendations.brief.product_brand || recommendations.brief.industry || 'Campaign'} - ${recommendations.brief.campaign_objective || 'Audiences'}`;
    setAudienceGroupName(autoName);
    setShowSaveAudienceModal(true);
  };

  const handleConfirmSaveAudienceGroup = async () => {
    if (!audienceGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    const audienceGroup = {
      name: audienceGroupName,
      personas: recommendations.audiences.map(a => a.persona || a.name || 'Unknown'),
      totalReach: recommendations.audiences.reduce((sum, a) => sum + (a.totalAudience || 0), 0),
      uniqueReach: recommendations.summary.uniqueReach || 0,
      industry: recommendations.brief.industry,
      objective: recommendations.brief.campaign_objective,
      geography: recommendations.brief.geography || [],
      createdAt: new Date().toISOString(),
      createdBy: 'AI Wizard'
    };

    try {
      // Save to backend
      const response = await axios.post('/api/audience-groups', audienceGroup);
      
      if (response.data.success) {
        // Update local state - backend returns group in data.data
        const savedGroup = response.data.data;
        setSavedAudienceGroups(prev => [...prev, savedGroup]);
        
        // Close modal
        setShowSaveAudienceModal(false);
        setAudienceGroupName('');
        
        // Notify user
        addMessage('assistant', `Audience group "${audienceGroupName}" saved! You can reuse it in future campaigns from the Target Segment tab.`);
      }
    } catch (error) {
      console.error('Error saving audience group:', error);
      
      // Fallback: Save to localStorage if backend fails
      const existingGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      const groupWithId = { ...audienceGroup, id: Date.now().toString() };
      existingGroups.push(groupWithId);
      localStorage.setItem('savedAudienceGroups', JSON.stringify(existingGroups));
      
      setSavedAudienceGroups(prev => [...prev, groupWithId]);
      setShowSaveAudienceModal(false);
      setAudienceGroupName('');
      
      addMessage('assistant', `Audience group "${audienceGroupName}" saved locally! You can reuse it in future campaigns.`);
    }
  };

  const handleLoadAudienceGroup = (group) => {
    if (!group || !group.personas || group.personas.length === 0) return;
    
    // Update brief with loaded personas
    setBrief(prev => ({
      ...prev,
      selectedPersonas: group.personas,
      audience: group.personas.join(', ')
    }));
    
    addMessage('assistant', `Loaded audience group "${group.name}" with ${group.personas.length} personas: ${group.personas.join(', ')}. Ready to continue?`);
  };

  // Handle message feedback (thumbs up/down)
  const handleMessageFeedback = async (messageIndex, feedbackType) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;
    
    // Update local state
    setMessageFeedback(prev => ({
      ...prev,
      [messageIndex]: feedbackType
    }));
    
    // Send feedback to backend for logging/learning
    try {
      await axios.post('/api/ai-chat/feedback', {
        conversationId: conversationIdRef.current,
        messageIndex,
        messageContent: message.content,
        feedback: feedbackType, // 'like' or 'dislike'
        context: {
          brief: brief,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`📊 Feedback recorded: ${feedbackType} for message ${messageIndex}`);
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Silent fail - feedback is non-critical
    }
  };

  // Handle regenerate response
  const handleRegenerateResponse = async (messageIndex) => {
    console.log(`[REGENERATE] Regenerating response for message ${messageIndex}`);
    
    // Get the user message that triggered this assistant response
    const userMessage = messages[messageIndex - 1]?.content;
    if (!userMessage) {
      console.error('[REGENERATE] No user message found');
      return;
    }

    setIsLoading(true);
    try {
      // Resend the same user message
      const result = await sendAIMessage(
        userMessage,
        messages.slice(0, messageIndex - 1), // History up to this point
        brief
      );

      if (result.success) {
        // Replace the assistant message
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: result.response,
            regenerated: true
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('[REGENERATE] Error:', error);
      addMessage('assistant', "I couldn't regenerate that response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate comparison responses (Option A vs Option B)
  const handleGenerateComparison = async (messageIndex) => {
    console.log(`[COMPARISON] Generating A/B options for message ${messageIndex}`);
    
    const userMessage = messages[messageIndex - 1]?.content;
    const currentResponse = messages[messageIndex]?.content;
    
    if (!userMessage || !currentResponse) {
      console.error('[COMPARISON] Missing message data');
      return;
    }

    setGeneratingComparison(messageIndex);
    setComparisonMode(prev => ({
      ...prev,
      [messageIndex]: { optionA: currentResponse, optionB: null, loading: true }
    }));

    try {
      // Generate alternative response
      const result = await sendAIMessage(
        userMessage,
        messages.slice(0, messageIndex - 1),
        brief
      );

      if (result.success) {
        setComparisonMode(prev => ({
          ...prev,
          [messageIndex]: {
            optionA: currentResponse,
            optionB: result.response,
            loading: false
          }
        }));
      }
    } catch (error) {
      console.error('[COMPARISON] Error generating option B:', error);
      setComparisonMode(prev => {
        const updated = { ...prev };
        delete updated[messageIndex];
        return updated;
      });
    } finally {
      setGeneratingComparison(null);
    }
  };

  // User selects preferred option
  const handleSelectPreferredOption = async (messageIndex, selectedOption, optionAContent, optionBContent) => {
    console.log(`[COMPARISON] User selected ${selectedOption} for message ${messageIndex}`);

    try {
      // Send preference data to backend
      await axios.post('/api/ai-chat/comparison-feedback', {
        conversationId: conversationIdRef.current,
        messageIndex,
        userMessage: messages[messageIndex - 1]?.content || '',
        optionA: optionAContent,
        optionB: optionBContent,
        preferredOption: selectedOption, // 'A' or 'B'
        context: {
          brief,
          timestamp: Date.now()
        }
      });

      console.log(`[COMPARISON] Preference recorded: ${selectedOption}`);

      // Update the message with the selected option
      const selectedContent = selectedOption === 'A' ? optionAContent : optionBContent;
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          content: selectedContent,
          comparedAndSelected: true,
          selectedOption
        };
        return newMessages;
      });

      // Clear comparison mode for this message
      setComparisonMode(prev => {
        const updated = { ...prev };
        delete updated[messageIndex];
        return updated;
      });

    } catch (error) {
      console.error('[COMPARISON] Error recording preference:', error);
    }
  };

  // Cancel comparison mode
  const handleCancelComparison = (messageIndex) => {
    setComparisonMode(prev => {
      const updated = { ...prev };
      delete updated[messageIndex];
      return updated;
    });
  };

  // Handle report with preset feedback
  const handleReport = async (messageIndex, reason) => {
    console.log(`[REPORT] Message ${messageIndex} reported: ${reason}`);
    
    try {
      await axios.post('/api/ai-chat/feedback', {
        conversationId: conversationIdRef.current,
        messageIndex,
        messageContent: messages[messageIndex]?.content || '',
        feedback: 'report',
        reportReason: reason,
        context: { 
          brief,
          timestamp: new Date().toISOString()
        }
      });
      
      // Show confirmation
      setMessageFeedback(prev => ({
        ...prev,
        [messageIndex]: 'reported'
      }));
      
      // Close menu
      setShowReportMenu(null);
      
      console.log(`📊 Report recorded: ${reason} for message ${messageIndex}`);
    } catch (error) {
      console.error('Error sending report:', error);
    }
  };

  // Load saved audience groups on mount
  useEffect(() => {
    const loadSavedGroups = async () => {
      try {
        const response = await axios.get('/api/audience-groups');
        if (response.data.success) {
          setSavedAudienceGroups(response.data.data || []);
        }
      } catch (error) {
        // Fallback to localStorage
        const localGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
        setSavedAudienceGroups(localGroups);
      }
    };
    
    loadSavedGroups();
  }, []);



  const handleEditMessage = (idx) => {
    const msg = messages[idx];
    if (msg.role === 'user') {
      setEditingIndex(idx);
      setEditText(msg.content);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editingIndex === null) return;

    const userMessage = editText.trim();

    // Remove all messages after the edited one
    const newMessages = messages.slice(0, editingIndex);
    setMessages(newMessages);

    // Add the edited message
    addMessage('user', userMessage);
    setEditingIndex(null);
    setEditText('');
    setIsLoading(true);

    // For 7-step flow: Just send the edited message to the backend API
    // The backend will maintain the correct step progression
    try {
      console.log('[EDIT] Sending edited message to backend:', userMessage);
      console.log('[EDIT] Conversation history:', newMessages.length, 'messages');
      console.log('[EDIT] Current brief:', brief);

      const result = await sendAIMessage(
        userMessage,
        newMessages,
        brief
      );

      console.log('[EDIT] Backend response:', result);

      if (result.success) {
        // Clean response
        let cleanResponse = result.response;
        
        // Remove any JSON artifacts
        if (cleanResponse.startsWith('{') || cleanResponse.includes('"response"')) {
          try {
            const parsed = JSON.parse(cleanResponse);
            cleanResponse = parsed.response || cleanResponse;
          } catch (e) {
            const match = cleanResponse.match(/"response"\s*:\s*"([^"]+)"/);
            if (match) cleanResponse = match[1];
          }
        }
        
        // Replace \\n with real newlines
        cleanResponse = cleanResponse.replace(/\\n/g, '\n');
        
        if (cleanResponse && cleanResponse.trim()) {
          // CRITICAL: Pass extractedEntities as data to show action buttons
          addMessage('assistant', cleanResponse, result.extractedEntities);
          
          // Update brief with extracted entities
          if (result.extractedEntities) {
            console.log('[EDIT] Updating brief with:', result.extractedEntities);
            const updatedBrief = { ...brief };
            Object.keys(result.extractedEntities).forEach(key => {
              if (result.extractedEntities[key] !== null && result.extractedEntities[key] !== undefined) {
                updatedBrief[key] = result.extractedEntities[key];
              }
            });
            setBrief(updatedBrief);
            console.log('[EDIT] Updated brief:', updatedBrief);
          }
        } else {
          console.error('[EDIT] Empty response');
          addMessage('assistant', "I apologize, I didn't generate a proper response. Could you please repeat that?");
        }
      } else {
        console.error('[EDIT] API error:', result.error);
        addMessage('assistant', "I apologize, there was an error processing your message. Could you please try again?");
      }
    } catch (error) {
      console.error('[EDIT] Error:', error);
      addMessage('assistant', "I apologize, there was an error processing your message. Could you please try again?");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler functions must be defined at component level (depth 1)
  return (
    <Layout>
      {/* Campaign Strategy Panel - Collapsible Right Sidebar */}
      <CampaignBriefPanel 
        brief={brief} 
        onUpdate={handleBriefUpdate}
        isCollapsed={isPanelCollapsed}
        onCollapseChange={setIsPanelCollapsed}
      />
      
      <div className={`min-h-screen bg-[#0a0a0a] transition-all duration-300 ${isPanelCollapsed ? 'mr-0' : 'mr-0 lg:mr-[320px]'}`}>
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ KULT AI MEDIA STRATEGIST ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                Campaign Planner
              </h1>
              <p className="text-gray-400 mt-1 text-sm">Natural conversation • Smart extraction • Data-driven plans</p>
            </div>
            <div className="flex gap-2">
              {/* Save as Draft - Always visible when there's a plan */}
              {brief.campaignName && (
                <button
                  onClick={() => handleSaveDraft()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Save current campaign as draft"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save as Draft</span>
                </button>
              )}
              <button
                onClick={handleStartNew}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Start a new campaign"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Campaign</span>
              </button>
              {messages.length > 0 && (
                <button
                  onClick={handleStartNew}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Clear all conversation and start fresh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-180px)]" style={{ minHeight: '500px' }}>
          <div className="flex-1 bg-[#0f0f0f] border border-gray-800 rounded-lg overflow-hidden flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-[#1a1a1a] text-gray-100 border border-gray-800'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 text-cyan-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-xs font-bold">Strategist</span>
                      </div>
                    )}
                    
                    {/* Edit mode for user messages */}
                    {msg.role === 'user' && editingIndex === idx ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-cyan-700 text-white p-2 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-white text-cyan-600 text-xs font-medium rounded hover:bg-gray-100 transition-colors"
                          >
                            Save & Regenerate
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-cyan-700 text-white text-xs font-medium rounded hover:bg-cyan-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content.split('\n').map((line, i) => {
                        if (line.startsWith('###')) {
                          return <h3 key={i} className="text-base font-bold text-cyan-400 mt-3 mb-2">{line.replace('###', '').trim()}</h3>;
                        }
                        if (line.startsWith('##')) {
                          return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('##', '').trim()}</h2>;
                        }
                        if (line === '---') {
                          return <div key={i} className="border-t border-gray-700 my-3"></div>;
                        }
                        
                        // Detect ALL CAPS section headers (e.g., "LIFESTYLE & INTERESTS:")
                        if (/^[A-Z][A-Z\s&]+:/.test(line.trim()) && line.trim().length > 10) {
                          return <h3 key={i} className="text-base font-bold text-cyan-400 mt-3 mb-2">{line.trim()}</h3>;
                        }
                        
                        // Handle inline bold and URLs
                        const renderWithBoldAndLinks = (text) => {
                          // First split by URLs
                          const urlRegex = /(https?:\/\/[^\s]+)/g;
                          const segments = text.split(urlRegex);
                          
                          return segments.map((segment, segIdx) => {
                            // If it's a URL, make it clickable
                            if (segment.match(urlRegex)) {
                              return (
                                <a 
                                  key={segIdx} 
                                  href={segment} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 underline"
                                >
                                  {segment}
                                </a>
                              );
                            }
                            
                            // Otherwise, handle bold formatting
                            const parts = segment.split(/(\*\*.*?\*\*)/g);
                            return parts.map((part, idx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={`${segIdx}-${idx}`} className="text-cyan-400 font-semibold">{part.replace(/\*\*/g, '')}</strong>;
                              }
                              return <span key={`${segIdx}-${idx}`}>{part}</span>;
                            });
                          });
                        };
                        
                        if (line.startsWith('•')) {
                          return <div key={i} className="ml-4 my-1">{renderWithBoldAndLinks(line)}</div>;
                        }
                        
                        return <div key={i}>{renderWithBoldAndLinks(line)}</div>;
                      })}
                    </div>
                    )}
                    
                    {/* Action buttons when campaign is finalized - Only show on last message with showActions */}
                    {msg.role === 'assistant' && msg.data?.showActions && idx === messages.length - 1 && (
                      <div className="mt-6 pt-4">
                        <div className="flex flex-col gap-3">
                          {/* Export buttons only - Save as Draft is now in the header */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Export to PDF Button - Blue to Purple Gradient */}
                            <button
                              onClick={() => handleExportPDF()}
                              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">Export to PDF</span>
                            </button>

                            {/* Export to Excel Button - Green */}
                            <button
                              onClick={() => handleExportExcel()}
                              className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 border border-green-500 hover:border-green-400"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-medium">Export to Excel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Feedback buttons for assistant messages - Show on all except final message with showActions */}
                    {msg.role === 'assistant' && !(msg.data?.showActions && idx === messages.length - 1) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                        {/* Thumbs Up - Outline */}
                        <button
                          onClick={() => handleMessageFeedback(idx, 'like')}
                          className={`p-1.5 rounded transition-colors ${
                            messageFeedback[idx] === 'like'
                              ? 'text-green-500'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Good response"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        
                        {/* Thumbs Down - Outline */}
                        <button
                          onClick={() => handleMessageFeedback(idx, 'dislike')}
                          className={`p-1.5 rounded transition-colors ${
                            messageFeedback[idx] === 'dislike'
                              ? 'text-red-500'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Poor response"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </button>
                        
                        {/* Regenerate Button */}
                        <button
                          onClick={() => handleRegenerateResponse(idx)}
                          className="p-1.5 rounded transition-colors text-gray-400 hover:text-gray-200"
                          title="Regenerate response"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        
                        {/* Report Button with Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowReportMenu(showReportMenu === idx ? null : idx)}
                            className="p-1.5 rounded transition-colors text-gray-400 hover:text-gray-200"
                            title="Report issue"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                          </button>
                          
                          {/* Report Menu Dropdown */}
                          {showReportMenu === idx && (
                            <div className="absolute left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                              <div className="p-2">
                                <div className="text-xs text-gray-400 font-semibold mb-2 px-2">Report an issue:</div>
                                {[
                                  { value: 'not_relevant', label: 'Response is not relevant' },
                                  { value: 'incorrect_info', label: 'Incorrect information' },
                                  { value: 'incomplete', label: 'Incomplete response' },
                                  { value: 'confusing', label: 'Confusing or unclear' },
                                  { value: 'offensive', label: 'Offensive content' },
                                  { value: 'other', label: 'Other issue' }
                                ].map(option => (
                                  <button
                                    key={option.value}
                                    onClick={() => handleReport(idx, option.value)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Compare Button */}
                        {!comparisonMode[idx] && (
                          <button
                            onClick={() => handleGenerateComparison(idx)}
                            className="p-1.5 rounded transition-colors text-gray-400 hover:text-gray-200"
                            title="Compare with alternative response"
                            disabled={isLoading || generatingComparison === idx}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Feedback confirmation messages */}
                        {messageFeedback[idx] && (
                          <span className="text-xs text-gray-500 ml-2">
                            {messageFeedback[idx] === 'like' && 'Thanks for your feedback!'}
                            {messageFeedback[idx] === 'dislike' && "Thanks! We'll improve."}
                            {messageFeedback[idx] === 'reported' && 'Report submitted. Thank you!'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Comparison Mode UI */}
                    {comparisonMode[idx] && msg.role === 'assistant' && (
                      <div className="mt-4 border-t border-gray-700 pt-4">
                        <div className="text-xs text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Which response do you prefer?
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Option A */}
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                            <div className="text-xs font-bold text-yellow-400 mb-2">OPTION A</div>
                            <div className="text-sm text-gray-300 mb-3 max-h-40 overflow-y-auto">
                              {comparisonMode[idx].optionA}
                            </div>
                            <button
                              onClick={() => handleSelectPreferredOption(idx, 'A', comparisonMode[idx].optionA, comparisonMode[idx].optionB)}
                              className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                              disabled={comparisonMode[idx].loading}
                            >
                              Choose Option A
                            </button>
                          </div>
                          
                          {/* Option B */}
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                            <div className="text-xs font-bold text-purple-400 mb-2">OPTION B</div>
                            {comparisonMode[idx].loading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="relative w-12 h-12">
                                  {/* Outer ring */}
                                  <div className="absolute inset-0 rounded-full border-3 border-gray-800"></div>
                                  {/* Animated arc */}
                                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-purple-400 animate-spin"></div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-300 mb-3 max-h-40 overflow-y-auto">
                                  {comparisonMode[idx].optionB}
                                </div>
                                <button
                                  onClick={() => handleSelectPreferredOption(idx, 'B', comparisonMode[idx].optionA, comparisonMode[idx].optionB)}
                                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                                >
                                  Choose Option B
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Cancel button */}
                        <button
                          onClick={() => handleCancelComparison(idx)}
                          className="mt-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                        >
                          Cancel Comparison
                        </button>
                      </div>
                    )}
                    
                    {/* Edit button for user messages */}
                    {msg.role === 'user' && editingIndex !== idx && (
                      <button
                        onClick={() => handleEditMessage(idx)}
                        className="mt-2 text-xs text-cyan-200 hover:text-white flex items-center gap-1 transition-colors"
                        disabled={isLoading}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-800 bg-[#0a0a0a] p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tell me about your campaign..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={isLoading ? handleStopAI : handleSendMessageWithOpenAI}
                  disabled={!isLoading && !inputMessage.trim()}
                  className={`px-6 py-3 ${
                    isLoading 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700'
                  } text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2`}
                  title={isLoading ? "Stop AI processing" : "Powered by OpenAI GPT-4o-mini"}
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Audience Group Modal */}
      {showSaveAudienceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Save Audience Group</h3>
            
            {recommendations && recommendations.audiences && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">
                  Saving {recommendations.audiences.length} personas:
                </p>
                <div className="bg-gray-900 rounded p-3 max-h-32 overflow-y-auto">
                  {recommendations.audiences.map((a, idx) => (
                    <div key={idx} className="text-cyan-400 text-xs mb-1">
                      • {a.persona || a.name || 'Unknown'} ({(a.totalAudience || 0).toLocaleString()} reach)
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={audienceGroupName}
                onChange={(e) => setAudienceGroupName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g., Samsung - Awareness Campaign"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveAudienceModal(false);
                  setAudienceGroupName('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveAudienceGroup}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
              >
                Save Group
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Clear All Conversations?</h3>
            
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to clear all conversation and start fresh? Any unsaved campaign data will be lost.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirmModal(false);
                  clearAllData();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
      
    </Layout>
  );
}

export default AIWizard;
