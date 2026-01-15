/**
 * AI Chat API - OpenAI-powered conversational media planning
 * Uses GPT-4o-mini for natural, context-aware campaign planning conversations
 */

import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load industry playbook data
let industryPlaybook = null;
try {
  const playbookPath = path.join(__dirname, '../../frontend/src/data/verticalPlaybook.json');
  industryPlaybook = JSON.parse(fs.readFileSync(playbookPath, 'utf8'));
  console.log('[AI CHAT] Industry playbook loaded successfully');
} catch (error) {
  console.warn('[AI CHAT] Could not load industry playbook:', error.message);
}

/**
 * Fetch KULT planning data for context-rich recommendations
 * WITH CACHING - cache for 5 minutes to speed up responses
 */
let kultDataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchKULTData(brief) {
  try {
    // Check cache first (SPEED OPTIMIZATION)
    const now = Date.now();
    if (kultDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('[KULT DATA] ⚡ Using cached data (fast path)');
      return kultDataCache;
    }
    
    console.log('[KULT DATA] Fetching planning context...');
    
    const [ratesRes, inventoryRes, audienceRes, formatsRes] = await Promise.all([
      axios.get('http://localhost:5001/api/rates').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5001/api/inventory').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5001/api/audience').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5001/api/formats').catch(() => ({ data: { data: [] } }))
    ]);

    const rates = ratesRes.data?.data || [];
    const sites = inventoryRes.data?.data || [];
    const audiences = audienceRes.data?.data || [];
    const formats = formatsRes.data?.data || [];

    console.log(`[KULT DATA] Loaded: ${rates.length} rates, ${sites.length} sites, ${audiences.length} audiences`);

    // Get industry-specific playbook recommendations
    let playbookRecommendations = null;
    if (industryPlaybook && brief?.industry) {
      const industry = brief.industry.toLowerCase();
      
      // Enhanced industry matching with keywords
      const industryKeywords = {
        'beauty': ['beauty', 'perfume', 'cosmetic', 'makeup', 'skincare', 'fragrance'],
        'automotive_ice': ['automotive', 'car', 'vehicle', 'suv', 'sedan'],
        'automotive_ev': ['ev', 'electric vehicle', 'electric car'],
        'property_luxury': ['luxury property', 'luxury home', 'luxury condo'],
        'property_mid_range': ['property', 'home', 'house', 'condo', 'apartment'],
        'fmcg': ['fmcg', 'food', 'beverage', 'snack', 'consumer goods'],
        'finance_insurance': ['finance', 'insurance', 'loan', 'banking'],
        'telco': ['telco', 'telecom', 'mobile', 'internet plan'],
        'retail_ecommerce': ['ecommerce', 'retail', 'online shop'],
        'travel': ['travel', 'tourism', 'hotel', 'vacation'],
        'f_b': ['restaurant', 'cafe', 'f&b', 'food service']
      };
      
      // Try exact match first
      let industryKey = Object.keys(industryPlaybook.persona_mapping).find(key =>
        key.toLowerCase() === industry ||
        key.toLowerCase().includes(industry) ||
        industry.includes(key.split('_')[0])
      );
      
      // If no match, try keyword matching
      if (!industryKey) {
        for (const [key, keywords] of Object.entries(industryKeywords)) {
          if (keywords.some(keyword => industry.includes(keyword))) {
            industryKey = key;
            break;
          }
        }
      }
      
      if (industryKey && industryPlaybook.persona_mapping[industryKey]) {
        playbookRecommendations = industryPlaybook.persona_mapping[industryKey];
        console.log('[KULT DATA] Found playbook for industry:', industryKey, '(from:', industry, ')');
      } else {
        console.log('[KULT DATA] No playbook found for industry:', industry);
      }
    }

    // Calculate platform-specific CPM rates from actual rate cards
    const platformRates = {};
    rates.forEach(r => {
      // Fix platform name: "KULT CTV Everywhere" should be "KULT Video Everywhere"
      let platform = r.Platform;
      if (platform && platform.includes('CTV Everywhere')) {
        platform = platform.replace('CTV Everywhere', 'Video Everywhere');
      }
      
      let cpmDirect = parseFloat(r['CPM Direct (RM)']) || 0;
      const cpmPG = parseFloat(r['CPM PG (RM)']) || 0;
      const cpmPD = parseFloat(r['CPM PD (RM)']) || 0;
      
      // Fix KULT Video Everywhere rate: should be RM 25, not RM 36
      if (platform && platform.includes('Video Everywhere') && cpmDirect === 36) {
        cpmDirect = 25;
      }
      
      // DEFAULT: Use CPM Direct (unless user specifically requests PG or PD)
      // Direct buying = guaranteed impressions, premium placement, better control
      const bestRate = cpmDirect || cpmPG || cpmPD;
      
      if (platform && bestRate > 0) {
        platformRates[platform] = {
          direct: cpmDirect,
          pg: cpmPG,
          pd: cpmPD,
          best: bestRate,
          type: r['Type of Platform']
        };
      }
    });

    // Calculate average CPM by channel type (DEFAULT: Use CPM Direct first)
    const ottRates = rates.filter(r => r['Type of Platform']?.includes('OTT')).map(r => parseFloat(r['CPM Direct (RM)']) || parseFloat(r['CPM PG (RM)']) || parseFloat(r['CPM PD (RM)'])).filter(v => v > 0);
    const socialRates = rates.filter(r => r['Type of Platform']?.includes('Social')).map(r => parseFloat(r['CPM Direct (RM)']) || parseFloat(r['CPM PG (RM)']) || parseFloat(r['CPM PD (RM)'])).filter(v => v > 0);
    const displayRates = rates.filter(r => r['Type of Platform']?.includes('Display')).map(r => parseFloat(r['CPM Direct (RM)']) || parseFloat(r['CPM PG (RM)']) || parseFloat(r['CPM PD (RM)'])).filter(v => v > 0);

    const avgOTT = ottRates.length > 0 ? Math.round(ottRates.reduce((a, b) => a + b, 0) / ottRates.length) : 30;
    const avgSocial = socialRates.length > 0 ? Math.round(socialRates.reduce((a, b) => a + b, 0) / socialRates.length) : 15;
    const avgDisplay = displayRates.length > 0 ? Math.round(displayRates.reduce((a, b) => a + b, 0) / displayRates.length) : 12;

    console.log('[KULT DATA] Platform Rates:', Object.keys(platformRates).length, 'platforms loaded');
    console.log('[KULT DATA] Channel Averages: OTT=RM', avgOTT, 'Social=RM', avgSocial, 'Display=RM', avgDisplay);

    // Filter and prepare relevant recommendations based on brief
    const context = {
      topSites: sites.slice(0, 10).map(s => ({
        name: s.site,
        category: s.category,
        monthlyTraffic: s.monthlyTraffic,
        geo: s.geo
      })),
      topAudiences: audiences.slice(0, 8).map(a => {
        // Calculate total audience across all states
        const stateKeys = Object.keys(a).filter(k => k !== 'id' && k !== 'Personas' && k !== 'Category');
        const total = stateKeys.reduce((sum, state) => {
          const value = a[state];
          const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : (value || 0);
          return sum + numValue;
        }, 0);
        
        return {
          name: a.Personas,
          size: total,
          description: a.description || ''
        };
      }),
      platformRates,
      channelRates: {
        ott: avgOTT,
        social: avgSocial,
        display: avgDisplay
      },
      availableFormats: formats.slice(0, 5).map(f => f.name),
      industryPlaybook: playbookRecommendations
    };

    // Cache the result (SPEED OPTIMIZATION)
    kultDataCache = context;
    cacheTimestamp = Date.now();
    console.log('[KULT DATA] ✅ Data cached for 5 minutes');

    return context;
  } catch (error) {
    console.error('[KULT DATA ERROR]:', error.message);
    return null;
  }
}

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-dev'
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
  : null;

/**
 * System prompt for AI media strategist
 */
// ============================================================================
// MODULAR PROMPT SYSTEM - Load only what's needed for current step
// ============================================================================

const BASE_PROMPT = `You are a SENIOR MEDIA STRATEGIST for KULT Planning Engine, helping clients plan campaigns in Malaysia.

JSON FORMAT: Always respond: {"response": "...", "extractedEntities": {...}}
NO EMOJIS. Use \n\n for paragraphs, \n for line breaks.
Track currentStep (0-8) in extractedEntities. 

🚨 CRITICAL RULE: ONE question at a time. NEVER ask multiple questions in one response.
ALWAYS provide a "response" field with the next question to ask the user.

NEVER return empty response! After extracting data, ALWAYS ask the next question.

Example:
- ❌ WRONG: {"response": "", "extractedEntities": {"currentStep": 1, "campaignName": "..."}}
- ✅ CORRECT: {"response": "Great! When would you like to start?", "extractedEntities": {"currentStep": 1, "campaignName": "..."}}

KEYWORD MATCHING (Step 2): golf→Golf Fans, car→Automotive Enthusiasts, property→Home Buyers, football→EPL Fans, fashion→Fashion Icons, food→Foodies

FORMAT RECOMMENDATIONS (Step 4A): Always explain WHY you recommend specific formats based on campaign objective. Reference https://kult.my/gallery/ for visual examples.

🚨 CRITICAL: NEVER set showActions:true until Step 8!
FINALIZATION (Step 8 ONLY): When user confirms finalization, set showActions:true in extractedEntities
FORBIDDEN: Do NOT set showActions:true at Steps 0-7!

STEP SEQUENCE WITH EXACT QUESTIONS:

Step 0: Ask "What's your campaign name?"
  → User provides name → Update currentStep to 1

Step 1: Ask "When would you like to start the campaign and how long will it run?"
  → User provides dates → Update currentStep to 2

Step 2: Ask "Which location or geography are you targeting?"
  → User provides location → Update currentStep to 3

Step 3: Based on brief, suggest 2-3 personas: "I suggest targeting [Persona1], [Persona2], and [Persona3]. Does this sound good?"
  → User confirms → Update currentStep to 4

Step 4: Ask "What's your campaign budget in RM?"
  → User provides budget → Update currentStep to 5

Step 5: Ask "Which channels would you like to use? (OTT, Social, Display)"
  → User selects channels → Update currentStep to 5A for first channel

Step 5A: For each channel, ask about formats:
  OTT: Network(RM25) vs YouTube(RM30)/Astro(RM48)/Sooka(RM44)
  Social: "Would you like Static (RM 5 CPM) or Video (RM 9 CPM)? Video formats include Reels, Stories, and In-Feed Video on TikTok & Meta (Instagram/Facebook)."
  Display: First explain BUYING options, then suggest CREATIVE formats from playbook if available.
    BUYING: "High Impact Display (RM 20 CPM) - Premium placements with larger ad units"
           vs "IAB Standard Banner (RM 10 CPM) - Broad reach across multiple sites"
    CREATIVE FORMATS (if in playbook): Product Collector, Carousel, In-Banner Video, Hotspot, Mini-Game
    Always recommend High Impact Display for Awareness campaigns.
    Always mention: "You can view format examples at https://kult.my/gallery/"
Step 5C: Ask about creative assets
Step 6: Show summary, ask "Ready to generate?"
Step 7: Generate FULL plan with channel breakdown, budget, impressions, CPM, reach
Step 8: Ask to finalize

CHANNEL TRACKING: Save channels as "OTT,Social,Display" in extractedEntities. After each format answer, check remaining channels and ask about next one.

FORBIDDEN: Don't skip Step 6. Don't jump Step 5→7. Don't ask multiple questions at once.`;

// Alias for backward compatibility
const SYSTEM_PROMPT = BASE_PROMPT;

/**
 * Main AI Chat endpoint
 */
router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory, currentBrief } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // Pre-filter obviously off-topic queries to save API costs
    const lowerMessage = message.toLowerCase();
    const offTopicKeywords = [
      'weather', 'recipe', 'cook', 'movie', 'song', 'lyrics',
      'translate', 'translation', 'what is the capital', 'who is',
      'write code', 'debug', 'programming', 'python', 'javascript',
      'math problem', 'solve equation', 'calculate', 'homework',
      'joke', 'story', 'poem', 'essay',
      'health advice', 'medical', 'legal advice', 'lawyer',
      'relationship', 'dating', 'love advice'
    ];

    const isOffTopic = offTopicKeywords.some(keyword => 
      lowerMessage.includes(keyword) && 
      !lowerMessage.match(/campaign|advertis|market|media|budget|audience|brand|launch|promo/i)
    );

    if (isOffTopic) {
      console.log('[AI CHAT] Off-topic query detected:', message);
      return res.json({
        success: true,
        response: "I'm specialized in media campaign planning for the Malaysian market. I can help you with campaign strategy, budget allocation, audience targeting, and channel recommendations. Could you tell me about the campaign you'd like to plan?",
        extractedEntities: {},
        metadata: {
          method: 'filtered',
          reason: 'Off-topic query detected'
        }
      });
    }

    // Check if OpenAI is available
    if (!openai) {
      console.warn('[AI CHAT] OpenAI not configured - using fallback');
      return res.json({
        success: true,
        response: "I'm currently in demo mode. To enable full AI conversations, please configure your OpenAI API key. For now, I can help you build a media plan - just tell me about your campaign!",
        extractedEntities: {},
        metadata: {
          method: 'fallback',
          reason: 'OpenAI API key not configured'
        }
      });
    }

    console.log('[AI CHAT] Processing message:', message.substring(0, 50) + '...');
    console.log('[AI CHAT] Current brief:', currentBrief);

    // Fetch KULT planning data for context-rich recommendations
    const kultData = await fetchKULTData(currentBrief);

    // Build conversation history for context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add COMPACT KULT data context if available
    if (kultData) {
      // Build MINIMAL context - only essential data
      const topRates = Object.entries(kultData.platformRates || {}).slice(0, 5).map(([p, r]) => 
        `${p}: RM${r.best}`).join(', ');
      
      const topPersonas = kultData.topAudiences.slice(0, 5).map(a => 
        `${a.name} (${(a.size/1000000).toFixed(1)}M)`).join(', ');

      let kultContext = `
CPM RATES: ${topRates}
TOP PERSONAS: ${topPersonas}
CALCULATION: Impressions = (Budget RM / CPM) × 1,000`;

      // Add industry playbook if available (COMPACT)
      if (kultData.industryPlaybook?.primary_personas) {
        kultContext += `\nINDUSTRY PERSONAS: ${kultData.industryPlaybook.primary_personas.slice(0, 3).join(', ')}`;
      }

      // Add geography if specified
      let geography = '';
      if (currentBrief?.geography) {
        if (Array.isArray(currentBrief.geography)) {
          geography = currentBrief.geography.join(', ');
        } else {
          geography = currentBrief.geography;
        }
      }
      if (geography) {
      }
      
      messages.push({
        role: 'system',
        content: kultContext
      });
      
      console.log('[AI CHAT] Added KULT data context');
    }

    // Add conversation history (last 10 messages for context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })));
    }

    // Add current brief context
    if (currentBrief && Object.keys(currentBrief).length > 0) {
      const briefSummary = Object.entries(currentBrief)
        .filter(([key, value]) => value && !key.startsWith('_'))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      if (briefSummary) {
        messages.push({
          role: 'system',
          content: `Current campaign brief: ${briefSummary}`
        });
      }
    }

    // Add user's new message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('[AI CHAT] Calling OpenAI with', messages.length, 'messages');

    // Call OpenAI API
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and efficient for conversational AI
      messages: messages,
      temperature: 0.7, // Slightly creative but consistent
      max_tokens: 1000, // Allow comprehensive responses (increased from 300)
      response_format: { type: 'json_object' }, // Request structured output
    });

    const elapsed = Date.now() - startTime;
    console.log(`[AI CHAT] OpenAI response received in ${elapsed}ms`);
    console.log('[AI CHAT] Tokens used:', completion.usage?.total_tokens || 'N/A');

    // Parse AI response
    let aiResponse;
    let rawContent = completion.choices[0].message.content;
    
    // DEBUG: Log raw content
    console.log('[AI CHAT DEBUG] Raw content length:', rawContent?.length || 0);
    
    // DEBUG: Write raw content to file for inspection
    if (rawContent) {
      fs.writeFileSync('/tmp/openai-raw-response.txt', rawContent, 'utf8');
      console.log('[AI CHAT DEBUG] Raw content written to /tmp/openai-raw-response.txt');
    }
    
    // CRITICAL FIX: Trim whitespace before parsing JSON
    const trimmedContent = rawContent?.trim();
    
    try {
      aiResponse = JSON.parse(trimmedContent);
      console.log('[AI CHAT DEBUG] Parsed JSON successfully');
      console.log('[AI CHAT DEBUG] aiResponse.response length:', aiResponse.response?.length || 0);
    } catch (parseError) {
      console.log('[AI CHAT DEBUG] JSON parse failed:', parseError.message);
      console.log('[AI CHAT DEBUG] First 500 chars of trimmed content:', trimmedContent?.substring(0, 500));
      // Fallback if JSON parsing fails
      aiResponse = {
        response: trimmedContent,
        extractedEntities: {}
      };
    }

    // Format the response for readability
    let formattedResponse = aiResponse.response || aiResponse.message || rawContent;
    
    console.log('[AI CHAT DEBUG] formattedResponse before processing:', formattedResponse?.substring(0, 200) || 'EMPTY');
    
    // CRITICAL: If formattedResponse is still a JSON string, parse it again
    if (typeof formattedResponse === 'string' && formattedResponse.trim().startsWith('{')) {
      try {
        const nestedJson = JSON.parse(formattedResponse);
        if (nestedJson.response) {
          formattedResponse = nestedJson.response;
          console.log('[AI CHAT DEBUG] Extracted nested response');
        }
      } catch (e) {
        // Not JSON, continue with current value
        console.log('[AI CHAT DEBUG] Not nested JSON, continuing');
      }
    }
    
    console.log('[AI CHAT DEBUG] formattedResponse after nested check:', formattedResponse?.substring(0, 200) || 'EMPTY');
    
    if (formattedResponse && typeof formattedResponse === 'string') {
      // STEP 1: Un-escape JSON strings (convert \\n to actual newlines)
      formattedResponse = formattedResponse
        .replace(/\\n/g, '\n')    // Convert escaped newlines
        .replace(/\\t/g, '\t')    // Convert escaped tabs
        .replace(/\\"/g, '"')     // Convert escaped quotes
        .replace(/\\\\/g, '\\');  // Convert escaped backslashes
      
      console.log('[AI CHAT DEBUG] formattedResponse after unescape:', formattedResponse?.substring(0, 200) || 'EMPTY');
      
      // STEP 2: ONLY clean up if this looks like it has JSON artifacts (contains "response":" pattern)
      // DO NOT strip content if it's already clean text
      if (formattedResponse.includes('"response"') || formattedResponse.match(/^\s*[\{\"]/)) {
        console.log('[AI CHAT DEBUG] Detected JSON artifacts, cleaning...');
        formattedResponse = formattedResponse
          .replace(/^\s*\{?\s*"?response"?\s*:\s*"?/i, '')  // Remove {"response":" or {response: or "response":
          .replace(/["']?\s*,?\s*"?extractedEntities"?.*$/i, '')  // Remove trailing JSON
          .replace(/^["'\s{]+|["'\s}]+$/g, '');  // Trim quotes, spaces, braces
      } else {
        console.log('[AI CHAT DEBUG] No JSON artifacts detected, skipping cleanup');
      }
      
      console.log('[AI CHAT DEBUG] formattedResponse after JSON cleanup:', formattedResponse?.substring(0, 200) || 'EMPTY');
      
      // STEP 3: Minimal formatting - PRESERVE line breaks from OpenAI
      // Only clean up emojis and excessive whitespace, DO NOT modify line breaks
      formattedResponse = formattedResponse
        // Remove ALL emojis (keep only text, bullets, numbers)
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        
        // Clean up excessive newlines (more than 2 in a row)
        .replace(/\n{3,}/g, '\n\n')
        
        // Clean up multiple spaces (but not newlines)
        .replace(/[ \t]{2,}/g, ' ')
        
        // Trim leading/trailing whitespace
        .trim();
      
      console.log('[AI CHAT DEBUG] formattedResponse after ALL formatting:', formattedResponse?.substring(0, 200) || 'EMPTY');
      console.log('[AI CHAT DEBUG] Final length:', formattedResponse?.length || 0);
    }

    // Ensure we have the required fields
    const extractedEntities = aiResponse.extractedEntities || aiResponse.entities || {};
    
    // 🚨 CRITICAL SERVER-SIDE VALIDATION: FORCE showActions to false if not Step 7
    // This prevents export buttons from appearing too early
    if (extractedEntities.currentStep !== 8) {
      extractedEntities.showActions = false;
      console.log('[AI CHAT] Forced showActions=false (currentStep:', extractedEntities.currentStep, '!= 7)');
    }
    
    const response = {
      success: true,
      response: formattedResponse,
      extractedEntities: extractedEntities,
      metadata: {
        method: 'openai',
        model: 'gpt-4o-mini', // Fast model for quick responses
        responseTime: elapsed,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    };

    console.log('[AI CHAT] Extracted entities:', response.extractedEntities);
    console.log('[AI CHAT] Response length:', response.response.length, 'chars');
    console.log('[AI CHAT] Response preview:', response.response.substring(0, 100) + '...');

    res.json(response);

  } catch (error) {
    console.error('[AI CHAT ERROR]:', error);
    
    // Provide helpful fallback
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      details: error.message,
      fallbackResponse: "I'm having trouble processing your request right now. Could you try rephrasing or let me know what you'd like to plan?"
    });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, messageIndex, messageContent, feedback, reportReason, context } = req.body;
    
    // Create detailed feedback entry for AI learning
    const feedbackEntry = {
      // Identification
      conversationId,
      messageIndex,
      timestamp: new Date().toISOString(),
      
      // Content (truncated for storage)
      messageContent: messageContent.substring(0, 500),
      
      // Feedback type
      feedbackType: feedback, // 'like', 'dislike', 'report', 'regenerate'
      reportReason: reportReason || null, // Specific issue if reported
      
      // Context for learning
      context: {
        campaign_objective: context?.brief?.campaign_objective || 'unknown',
        industry: context?.brief?.industry || 'unknown',
        budget: context?.brief?.budget_rm || 0,
        geography: context?.brief?.geography || 'unknown',
        audience: context?.brief?.audience || 'unknown',
        
        // Session context
        conversationLength: context?.conversationLength || 0,
        timestamp: context?.timestamp || new Date().toISOString()
      },
      
      // Metadata for analysis
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        responseTime: context?.responseTime || null
      }
    };
    
    // 1. Store in daily log files (for analysis and training)
    const feedbackDir = path.join(__dirname, '../data/feedback');
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const feedbackFile = path.join(feedbackDir, `ai-chat-feedback-${today}.jsonl`);
    
    fs.appendFileSync(feedbackFile, JSON.stringify(feedbackEntry) + '\n');
    
    // 2. Store in Self-Learning Dashboard (aggregated stats)
    const dashboardFile = path.join(feedbackDir, 'ai-learning-dashboard.json');
    let dashboardData = { feedbackEntries: [], stats: {} };
    
    if (fs.existsSync(dashboardFile)) {
      try {
        dashboardData = JSON.parse(fs.readFileSync(dashboardFile, 'utf8'));
      } catch (e) {
        console.warn('[AI FEEDBACK] Could not parse dashboard file, creating new');
      }
    }
    
    // Add to dashboard
    dashboardData.feedbackEntries = dashboardData.feedbackEntries || [];
    dashboardData.feedbackEntries.push(feedbackEntry);
    
    // Keep only last 1000 entries (prevent file from getting too large)
    if (dashboardData.feedbackEntries.length > 1000) {
      dashboardData.feedbackEntries = dashboardData.feedbackEntries.slice(-1000);
    }
    
    // Update stats
    dashboardData.stats = {
      totalFeedback: dashboardData.feedbackEntries.length,
      likes: dashboardData.feedbackEntries.filter(f => f.feedbackType === 'like').length,
      dislikes: dashboardData.feedbackEntries.filter(f => f.feedbackType === 'dislike').length,
      reports: dashboardData.feedbackEntries.filter(f => f.feedbackType === 'report').length,
      satisfactionRate: 0,
      lastUpdated: new Date().toISOString(),
      
      // Report breakdown
      reportReasons: {},
      
      // Context patterns
      topIndustries: {},
      topObjectives: {}
    };
    
    // Calculate satisfaction rate
    const totalRatings = dashboardData.stats.likes + dashboardData.stats.dislikes;
    if (totalRatings > 0) {
      dashboardData.stats.satisfactionRate = 
        (dashboardData.stats.likes / totalRatings * 100).toFixed(1);
    }
    
    // Analyze report reasons
    dashboardData.feedbackEntries
      .filter(f => f.feedbackType === 'report' && f.reportReason)
      .forEach(f => {
        dashboardData.stats.reportReasons[f.reportReason] = 
          (dashboardData.stats.reportReasons[f.reportReason] || 0) + 1;
      });
    
    // Analyze context patterns
    dashboardData.feedbackEntries.forEach(f => {
      const industry = f.context?.industry || 'unknown';
      const objective = f.context?.campaign_objective || 'unknown';
      
      dashboardData.stats.topIndustries[industry] = 
        (dashboardData.stats.topIndustries[industry] || 0) + 1;
      dashboardData.stats.topObjectives[objective] = 
        (dashboardData.stats.topObjectives[objective] || 0) + 1;
    });
    
    // Save dashboard
    fs.writeFileSync(dashboardFile, JSON.stringify(dashboardData, null, 2));
    
    console.log(`[AI FEEDBACK] ${feedback} for message ${messageIndex} in conversation ${conversationId}`);
    if (reportReason) {
      console.log(`[AI FEEDBACK] Report reason: ${reportReason}`);
    }
    console.log(`[AI LEARNING] Dashboard updated - Satisfaction: ${dashboardData.stats.satisfactionRate}%`);
    
    res.json({ 
      success: true, 
      message: 'Feedback recorded and sent to Self-Learning Dashboard',
      dashboardStats: {
        totalFeedback: dashboardData.stats.totalFeedback,
        satisfactionRate: dashboardData.stats.satisfactionRate
      }
    });
  } catch (error) {
    console.error('[AI FEEDBACK] Error storing feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/ai-chat/learning-dashboard
 * Get AI Self-Learning Dashboard stats
 * 
 * Returns aggregated feedback data showing:
 * - Total feedback count
 * - Satisfaction rate (likes vs dislikes)
 * - Report reasons breakdown
 * - Context patterns (industries, objectives)
 * - Recent feedback entries
 */
router.get('/learning-dashboard', async (req, res) => {
  try {
    const feedbackDir = path.join(__dirname, '../data/feedback');
    const dashboardFile = path.join(feedbackDir, 'ai-learning-dashboard.json');
    
    if (!fs.existsSync(dashboardFile)) {
      return res.json({
        success: true,
        message: 'No feedback data yet',
        stats: {
          totalFeedback: 0,
          likes: 0,
          dislikes: 0,
          reports: 0,
          satisfactionRate: 0,
          reportReasons: {},
          topIndustries: {},
          topObjectives: {}
        },
        recentFeedback: []
      });
    }
    
    const dashboardData = JSON.parse(fs.readFileSync(dashboardFile, 'utf8'));
    
    // Get recent feedback (last 20 entries)
    const recentFeedback = dashboardData.feedbackEntries.slice(-20).reverse().map(f => ({
      timestamp: f.timestamp,
      feedbackType: f.feedbackType,
      reportReason: f.reportReason,
      industry: f.context?.industry,
      objective: f.context?.campaign_objective,
      messagePreview: f.messageContent.substring(0, 100) + '...'
    }));
    
    res.json({
      success: true,
      stats: dashboardData.stats,
      recentFeedback,
      lastUpdated: dashboardData.stats.lastUpdated
    });
  } catch (error) {
    console.error('[AI LEARNING] Error reading dashboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read learning dashboard' 
    });
  }
});

/**
 * POST /api/ai-chat/comparison-feedback
 * Store A/B comparison preference data for AI learning
 * 
 * This is called "Preference Learning" or "Comparative Feedback" and is one of the
 * most powerful ways to train AI models. Used by ChatGPT, Claude, and other advanced models.
 * 
 * Why This is Valuable:
 * - More precise than thumbs up/down (shows relative quality)
 * - Helps AI understand nuanced differences in responses
 * - Direct signal: "This is better than that"
 * - Can be used for Direct Preference Optimization (DPO)
 * 
 * How AI Systems Use Comparison Data:
 * 1. PREFERENCE LEARNING:
 *    - Model learns: "Response A is better than Response B"
 *    - More informative than absolute ratings
 *    - Trains reward model to predict human preferences
 * 
 * 2. DIRECT PREFERENCE OPTIMIZATION (DPO):
 *    - Modern alternative to RLHF
 *    - Directly optimizes model to prefer chosen responses
 *    - More stable and efficient than traditional RL
 * 
 * 3. RANKING MODELS:
 *    - Learn to rank multiple responses by quality
 *    - Used for response reranking at inference time
 *    - Improves consistency across different prompts
 * 
 * 4. PATTERN ANALYSIS:
 *    - Identify what makes one response better
 *    - Extract successful patterns and structures
 *    - Avoid patterns from rejected responses
 */
router.post('/comparison-feedback', async (req, res) => {
  try {
    const { conversationId, messageIndex, userMessage, optionA, optionB, preferredOption, context } = req.body;
    
    // Create comparison feedback entry
    const comparisonEntry = {
      timestamp: new Date().toISOString(),
      conversationId,
      messageIndex,
      userMessage: userMessage.substring(0, 500), // Truncate for storage
      optionA: optionA.substring(0, 1000),
      optionB: optionB.substring(0, 1000),
      preferredOption, // 'A' or 'B'
      rejectedOption: preferredOption === 'A' ? 'B' : 'A',
      context: {
        objective: context?.brief?.campaign_objective || 'unknown',
        industry: context?.brief?.industry || 'unknown',
        budget: context?.brief?.budget_rm || 0,
        geography: context?.brief?.geography || 'unknown'
      }
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data', 'feedback');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save to comparison-specific file (for training data)
    const dateStr = new Date().toISOString().split('T')[0];
    const comparisonFile = path.join(dataDir, `comparison-feedback-${dateStr}.jsonl`);
    fs.appendFileSync(comparisonFile, JSON.stringify(comparisonEntry) + '\n');

    console.log(`[COMPARISON FEEDBACK] User preferred ${preferredOption} for message ${messageIndex}`);
    console.log(`[COMPARISON FEEDBACK] Context: ${comparisonEntry.context.industry} - ${comparisonEntry.context.objective}`);

    // Update dashboard stats
    const dashboardFile = path.join(dataDir, 'ai-learning-dashboard.json');
    let dashboard = { stats: {}, recentFeedback: [], comparisonData: [] };
    
    if (fs.existsSync(dashboardFile)) {
      dashboard = JSON.parse(fs.readFileSync(dashboardFile, 'utf-8'));
    }

    // Add comparison stats
    if (!dashboard.comparisonData) {
      dashboard.comparisonData = [];
    }
    
    dashboard.comparisonData.unshift({
      timestamp: comparisonEntry.timestamp,
      preferredOption,
      industry: comparisonEntry.context.industry,
      objective: comparisonEntry.context.objective
    });

    // Keep only last 50 comparisons in dashboard
    if (dashboard.comparisonData.length > 50) {
      dashboard.comparisonData = dashboard.comparisonData.slice(0, 50);
    }

    dashboard.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dashboardFile, JSON.stringify(dashboard, null, 2));

    res.json({
      success: true,
      message: 'Comparison preference recorded'
    });

  } catch (error) {
    console.error('[COMPARISON FEEDBACK] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record comparison preference'
    });
  }
});

export default router;