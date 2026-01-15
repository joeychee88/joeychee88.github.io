import express from 'express';
import axios from 'axios';
import { generateOverviewRecommendationsV2 } from './ai-recommendations-v2.js';

const router = express.Router();

// Industry affinity mapping - maps personas to industries with scores (0-100)
const INDUSTRY_AFFINITY = {
  // Beauty Industry
  'beauty': {
    'Fashion Icons': 95,
    'Luxury Seekers': 92,
    'Luxury Buyers': 90,
    'Young Working Adult': 85,
    'Emerging Affluents': 85,
    'Online Shoppers': 82,
    'Health & Wellness Shoppers': 80,
    'Youth Mom': 78,
    'Mommy Pros ( Experienced Mother)': 75,
    'Little Steps Advocates ( Young Family)': 72,
    'Family Dynamic ( Experienced Family )': 70,
    'Entertainment': 65,
    'Music & Concert Goers': 65,
    'Active Lifestyle Seekers': 60,
    'Foodies': 60
  },
  // FMCG Industry
  'fmcg': {
    'Foodies': 95,
    'Family Dynamic ( Experienced Family )': 92,
    'Little Steps Advocates ( Young Family)': 88,
    'Health & Wellness Shoppers': 85,
    'Online Shoppers': 85,
    'Youth Mom': 90,
    'Mommy Pros ( Experienced Mother)': 85,
    'Home Buyers': 82,
    'Active Lifestyle Seekers': 80,
    'Young Working Adult': 75
  },
  // Automotive (ICE)
  'automotive_ice': {
    'Automotive Enthusiasts': 95,
    'Automotive Intent': 92,
    'Active Lifestyle Seekers': 85,
    'Business & Professional': 82,
    'Corporate Visionaries': 80,
    'Emerging Affluents': 78,
    'Gadget Gurus': 75,
    'Tech & Gadget Enthusiasts': 75,
    'Young Working Adult': 72,
    'Luxury Seekers': 70
  },
  // Automotive (EV)
  'automotive_ev': {
    'Automotive Intent': 92,
    'Automotive Enthusiasts': 90,
    'Eco Enthusiasts': 88,
    'Tech & Gadget Enthusiasts': 85,
    'Gadget Gurus': 85,
    'Emerging Affluents': 82,
    'Young Working Adult': 80,
    'Active Lifestyle Seekers': 78,
    'Corporate Visionaries': 75,
    'Business & Professional': 72
  },
  // Tech/Devices
  'tech_devices': {
    'Gadget Gurus': 95,
    'Tech & Gadget Enthusiasts': 92,
    'Esports Fan': 88,
    'Young Working Adult': 85,
    'Start-ups': 85,
    'Business & Professional': 82,
    'Online Shoppers': 80,
    'Students': 78,
    'Emerging Affluents': 75,
    'Corporate Visionaries': 72
  },
  // Retail/E-commerce
  'retail_ecommerce': {
    'Online Shoppers': 95,
    'Fashion Icons': 90,
    'Young Working Adult': 85,
    'Family Dynamic ( Experienced Family )': 85,
    'Foodies': 82,
    'Health & Wellness Shoppers': 82,
    'Little Steps Advocates ( Young Family)': 80,
    'Youth Mom': 85,
    'Home Buyers': 78,
    'Luxury Seekers': 88
  },
  // Property (Luxury)
  'property_luxury': {
    'Luxury Seekers': 95,
    'Luxury Buyers': 95,
    'Emerging Affluents': 90,
    'Corporate Visionaries': 88,
    'Business & Professional': 85,
    'Home Buyers': 92,
    'Young Working Adult': 80,
    'Family Dynamic ( Experienced Family )': 78,
    'Automotive Enthusiasts': 75,
    'Fashion Icons': 82
  },
  // Property (Mid-Range)
  'property_mid_range': {
    'Home Buyers': 95,
    'Family Dynamic ( Experienced Family )': 90,
    'Little Steps Advocates ( Young Family)': 88,
    'Young Working Adult': 85,
    'Youth Mom': 82,
    'Emerging Affluents': 80,
    'Business & Professional': 78,
    'Online Shoppers': 75,
    'Corporate Visionaries': 72,
    'Active Lifestyle Seekers': 70
  },
  // Property (Affordable)
  'property_affordable': {
    'Little Steps Advocates ( Young Family)': 95,
    'Youth Mom': 92,
    'Young Working Adult': 88,
    'Family Dynamic ( Experienced Family )': 85,
    'Students': 82,
    'Home Buyers': 90,
    'Online Shoppers': 78,
    'Start-ups': 75,
    'Active Lifestyle Seekers': 72,
    'Foodies': 70
  },
  // Telco
  'telco': {
    'Young Working Adult': 92,
    'Students': 90,
    'Online Shoppers': 88,
    'Esports Fan': 85,
    'Tech & Gadget Enthusiasts': 85,
    'Gadget Gurus': 82,
    'Business & Professional': 80,
    'Family Dynamic ( Experienced Family )': 78,
    'Active Lifestyle Seekers': 75,
    'Start-ups': 78
  },
  // Finance/Insurance
  'finance_insurance': {
    'Business & Professional': 95,
    'Corporate Visionaries': 92,
    'Emerging Affluents': 90,
    'Home Buyers': 88,
    'Family Dynamic ( Experienced Family )': 85,
    'Young Working Adult': 82,
    'Automotive Enthusiasts': 80,
    'Luxury Seekers': 78,
    'Little Steps Advocates ( Young Family)': 75,
    'SME': 85
  },
  // Banking/Fintech
  'banking_fintech': {
    'Young Working Adult': 95,
    'Business & Professional': 92,
    'Start-ups': 90,
    'Emerging Affluents': 88,
    'Tech & Gadget Enthusiasts': 85,
    'Online Shoppers': 82,
    'Corporate Visionaries': 85,
    'Gadget Gurus': 80,
    'Students': 78,
    'SME': 82
  },
  // Tourism
  'tourism': {
    'Travel & Experience Seekers': 95,
    'Active Lifestyle Seekers': 90,
    'Adventure Enthusiasts': 88,
    'Young Working Adult': 85,
    'Emerging Affluents': 82,
    'Luxury Seekers': 85,
    'Family Dynamic ( Experienced Family )': 80,
    'Entertainment': 78,
    'Foodies': 82,
    'Music & Concert Goers': 75
  },
  // SME/B2B
  'sme_b2b': {
    'SME': 95,
    'Business & Professional': 92,
    'Corporate Visionaries': 90,
    'Start-ups': 88,
    'Emerging Affluents': 85,
    'Young Working Adult': 82,
    'Tech & Gadget Enthusiasts': 80,
    'Online Shoppers': 78,
    'Gadget Gurus': 75,
    'Home Buyers': 72
  },
  // Entertainment/OTT
  'entertainment_ott': {
    'Entertainment': 95,
    'Music & Concert Goers': 92,
    'Esports Fan': 90,
    'Young Working Adult': 85,
    'Students': 88,
    'Romantic Comedy': 85,
    'Action & Adventure': 82,
    'Horror': 80,
    'Animation': 82,
    'Sci-Fi & Fantasy': 80,
    'Comedy Lover': 85,
    'EPL Super Fans': 78
  },
  // Gaming
  'gaming': {
    'Esports Fan': 95,
    'Students': 90,
    'Young Working Adult': 85,
    'Tech & Gadget Enthusiasts': 88,
    'Gadget Gurus': 85,
    'Entertainment': 80,
    'Online Shoppers': 78,
    'Active Lifestyle Seekers': 75,
    'Animation': 72,
    'Music & Concert Goers': 70
  },
  // Luxury
  'luxury': {
    'Luxury Seekers': 95,
    'Luxury Buyers': 95,
    'Fashion Icons': 92,
    'Emerging Affluents': 90,
    'Corporate Visionaries': 88,
    'Business & Professional': 85,
    'Young Working Adult': 82,
    'Automotive Enthusiasts': 80,
    'Home Buyers': 78,
    'Travel & Experience Seekers': 82
  },
  // Education
  'education': {
    'Students': 95,
    'Little Steps Advocates ( Young Family)': 92,
    'Family Dynamic ( Experienced Family )': 90,
    'Youth Mom': 88,
    'Mommy Pros ( Experienced Mother)': 85,
    'Young Working Adult': 80,
    'Business & Professional': 78,
    'Start-ups': 75,
    'Corporate Visionaries': 72,
    'Online Shoppers': 70
  },
  // F&B
  'f_and_b': {
    'Foodies': 95,
    'Entertainment': 88,
    'Active Lifestyle Seekers': 85,
    'Young Working Adult': 82,
    'Family Dynamic ( Experienced Family )': 85,
    'Travel & Experience Seekers': 80,
    'Music & Concert Goers': 78,
    'Health & Wellness Shoppers': 75,
    'Little Steps Advocates ( Young Family)': 78,
    'Online Shoppers': 80
  },
  // Lifestyle
  'lifestyle': {
    'Active Lifestyle Seekers': 95,
    'Health & Wellness Shoppers': 92,
    'Fashion Icons': 90,
    'Young Working Adult': 88,
    'Travel & Experience Seekers': 85,
    'Foodies': 85,
    'Adventure Enthusiasts': 88,
    'Music & Concert Goers': 82,
    'Entertainment': 80,
    'Online Shoppers': 82
  }
};

/**
 * POST /api/ai-recommendations/generate
 * Generate AI recommendations based on campaign brief
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      brief = {},
      step = 'audience',
      currentSelections = {}
    } = req.body;

    console.log('[AI RECOMMENDATIONS] Step:', step, 'Industry:', brief.industry);

    let recommendations = [];

    switch (step) {
      case 'audience':
        recommendations = await generateAudienceRecommendations(brief);
        break;
      
      case 'geography':
        recommendations = generateGeographyRecommendations(brief);
        break;
      
      case 'formats':
        recommendations = await generateFormatRecommendations(brief);
        break;
      
      case 'sites':
        recommendations = generateSiteRecommendations(brief);
        break;
      
      case 'budget':
        recommendations = await generateBudgetRecommendations(brief, currentSelections);
        break;
      
      case 'overview':
        recommendations = await generateOverviewRecommendations(brief, currentSelections);
        break;
      
      default:
        recommendations = [];
    }

    res.json({
      success: true,
      step,
      recommendations,
      count: recommendations.length
    });

  } catch (error) {
    console.error('[AI RECOMMENDATIONS ERROR]:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: []
    });
  }
});

async function generateAudienceRecommendations(brief) {
  const { industry = 'retail_ecommerce', campaign_objective = 'Awareness', budget_rm = 100000 } = brief;
  
  try {
    // Fetch real audience data from Google Sheets
    const audienceResponse = await axios.get('http://localhost:5001/api/audience', { timeout: 5000 });
    const allPersonas = audienceResponse.data?.data || [];
    
    if (allPersonas.length === 0) {
      console.warn('[AI RECOMMENDATIONS] No personas found in audience API');
      return [];
    }
    
    const recommendations = [];
    const industryAffinities = INDUSTRY_AFFINITY[industry.toLowerCase()] || {};
    
    for (const persona of allPersonas) {
      const personaName = persona.Personas;
      
      // Skip empty persona names
      if (!personaName || personaName.trim() === '') {
        continue;
      }
      
      // Get affinity score for this persona in the selected industry
      const affinity = industryAffinities[personaName] || 50; // Default to 50 if not mapped
      
      let confidence = affinity;
      
      // Calculate persona reach (sum of all state populations)
      // Note: Values come as strings with commas (e.g., "1,540,000")
      let personaReach = 0;
      Object.keys(persona).forEach(key => {
        if (key !== 'id' && key !== 'Personas' && persona[key]) {
          // Remove commas before parsing
          const cleanValue = String(persona[key]).replace(/,/g, '');
          const value = parseInt(cleanValue);
          if (!isNaN(value)) {
            personaReach += value;
          }
        }
      });
      
      // Boost confidence for high-reach personas in Awareness campaigns
      if (campaign_objective === 'Awareness' && personaReach > 2500000) {
        confidence += 10;
      }
      
      // Estimate CPM based on persona type (simplified)
      const baseCPM = 12;
      const cpm = affinity >= 85 ? baseCPM + 3 : affinity >= 70 ? baseCPM : baseCPM - 2;
      
      const budgetForAudience = budget_rm * 0.3;
      const estimatedImpressions = (budgetForAudience / cpm) * 1000;
      
      const reason = affinity >= 90 
        ? `Perfect match for ${industry} campaigns`
        : affinity >= 75
        ? `High affinity with ${industry} products`
        : affinity >= 60
        ? `Well-suited for ${campaign_objective.toLowerCase()} campaigns`
        : `Moderate fit for ${industry} audience`;
      
      // Only recommend personas with confidence >= 60
      if (confidence >= 60) {
        recommendations.push({
          id: personaName.toLowerCase().replace(/\s+/g, '-'),
          name: personaName,
          type: 'audience',
          confidence: Math.min(Math.round(confidence), 99),
          reach: personaReach,
          cost: cpm,
          reason,
          stats: { impressions: Math.round(estimatedImpressions) }
        });
      }
    }
    
    // Sort by confidence (highest first) and return top 5
    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations.slice(0, 5);
    
  } catch (error) {
    console.error('[AI RECOMMENDATIONS ERROR] Failed to fetch audience data:', error.message);
    return [];
  }
}

function generateGeographyRecommendations(brief) {
  return [
    {
      id: 'klang-valley',
      name: 'Klang Valley',
      type: 'geography',
      confidence: 92,
      reach: 7000000,
      cost: 9,
      weight: 60,
      reason: 'Highest urban density and digital penetration'
    },
    {
      id: 'penang',
      name: 'Penang',
      type: 'geography',
      confidence: 85,
      reach: 1780000,
      cost: 6,
      weight: 25,
      reason: 'Strong purchasing power and brand awareness'
    },
    {
      id: 'johor',
      name: 'Johor',
      type: 'geography',
      confidence: 80,
      reach: 3800000,
      cost: 7,
      weight: 15,
      reason: 'Growing market with good digital adoption'
    }
  ];
}

async function generateFormatRecommendations(brief) {
  const { campaign_objective = 'Awareness', industry = 'retail_ecommerce' } = brief;
  
  try {
    // Fetch real format data from Google Sheets
    const formatsResponse = await axios.get('http://localhost:5001/api/formats', { timeout: 5000 });
    const allFormats = formatsResponse.data?.data || [];
    
    // Filter active formats only
    const activeFormats = allFormats.filter(f => f.active);
    
    // Score formats based on campaign objective and properties
    const scoredFormats = activeFormats.map(format => {
      let score = 60; // Base score
      
      // Goal alignment (Awareness, Consideration, Conversion)
      const goalLower = (format.goal || '').toLowerCase();
      const objectiveLower = campaign_objective.toLowerCase();
      const typeLower = format.type.toLowerCase();
      
      // STRONG lead gen format bonus for Conversion/Lead Gen campaigns ONLY
      const isConversionObjective = objectiveLower === 'conversion' || 
                                     objectiveLower.includes('lead') || 
                                     objectiveLower.includes('sales') ||
                                     objectiveLower.includes('sign-up') ||
                                     objectiveLower.includes('signup');
      
      if (isConversionObjective) {
        // Heavily prioritize lead generation formats
        if (goalLower.includes('lead') || goalLower.includes('capture') || 
            goalLower.includes('form') || goalLower.includes('crm') || 
            goalLower.includes('sign-up') || goalLower.includes('signup')) {
          score += 30; // STRONG bonus for lead gen formats
        }
        
        // Interactive formats are great for conversion
        if (typeLower.includes('interactive')) {
          score += 15;
        }
        
        // Reduce video bonus for conversion campaigns (video is for awareness/consideration)
        if (typeLower.includes('video') || typeLower.includes('instream')) {
          score += 3; // Small bonus only
        }
      } else if (objectiveLower === 'consideration' || objectiveLower === 'engagement' || 
                  objectiveLower === 'traffic' || objectiveLower.includes('interest')) {
        // For Consideration campaigns: Prioritize engagement and interactive formats
        if (goalLower.includes('engagement') || goalLower.includes('interaction') || 
            goalLower.includes('consideration') || goalLower.includes('interest')) {
          score += 25; // Strong bonus for engagement formats
        }
        
        // Interactive formats are great for consideration
        if (typeLower.includes('interactive')) {
          score += 18; // Strong bonus for interactive
        }
        
        // Video formats drive engagement
        if (typeLower.includes('video') || typeLower.includes('instream')) {
          score += 12; // Higher than awareness
        }
        
        // Mini games and calculators are perfect for consideration
        const nameLower = format.name.toLowerCase();
        if (nameLower.includes('game') || nameLower.includes('calculator') || 
            nameLower.includes('quiz') || nameLower.includes('poll')) {
          score += 15;
        }
      } else {
        // For Awareness campaigns: Prioritize reach and visibility
        if (goalLower.includes(objectiveLower)) {
          score += 20;
        } else if (goalLower) {
          // Partial matches for awareness
          if (goalLower.includes('brand') || goalLower.includes('visibility') || 
              goalLower.includes('awareness') || goalLower.includes('reach')) {
            score += 18;
          }
        }
        
        // Premium formats get bonus for Awareness
        if (format.premium) {
          score += 15; // Increased from 10
        }
        
        // Video formats are strong for Awareness
        if (typeLower.includes('video') || typeLower.includes('instream')) {
          score += 10;
        }
        
        // Large format bonuses for awareness
        const nameLower = format.name.toLowerCase();
        if (nameLower.includes('masthead') || nameLower.includes('takeover') || 
            nameLower.includes('billboard') || nameLower.includes('interstitial')) {
          score += 12;
        }
      }
      
      // Industry alignment (if format has industry field)
      const industryLower = (format.industry || '').toLowerCase();
      if (industryLower && industryLower.includes(industry.toLowerCase())) {
        score += 10;
      }
      
      // Special: Lead-heavy industries get extra bonus for lead gen formats (only for conversion campaigns)
      const leadHeavyIndustries = [
        'automotive', 'auto', 'real estate', 'realestate', 'property',
        'finance', 'banking', 'insurance', 'education', 'b2b', 'saas',
        'healthcare', 'medical', 'legal', 'travel', 'hospitality'
      ];
      
      const isLeadHeavyIndustry = leadHeavyIndustries.some(keyword => 
        industry.toLowerCase().includes(keyword)
      );
      
      if (isLeadHeavyIndustry && isConversionObjective) {
        if (goalLower.includes('lead') || goalLower.includes('capture') || goalLower.includes('form')) {
          score += 20; // Extra bonus for lead-heavy industries
        }
      }
      
      // CPM efficiency for budget-conscious campaigns
      if (format.baseCpm < 15) {
        score += 5; // Reward affordable formats
      }
      
      // Cap score at 100
      score = Math.min(score, 100);
      
      return {
        ...format,
        score
      };
    });
    
    // Sort by score and take top 6
    const topFormats = scoredFormats
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    
    // Generate reason based on format properties
    const generateReason = (format) => {
      const reasons = [];
      
      if (format.premium) {
        reasons.push('Premium placement');
      }
      
      const typeLower = format.type.toLowerCase();
      if (typeLower.includes('video')) {
        reasons.push('High engagement');
      } else if (typeLower.includes('display')) {
        reasons.push('Cost-efficient reach');
      } else if (typeLower.includes('native')) {
        reasons.push('Native user experience');
      }
      
      if (format.benchmarkCtr) {
        reasons.push(`CTR: ${format.benchmarkCtr}`);
      }
      
      if (format.baseCpm < 15) {
        reasons.push('Budget-friendly');
      }
      
      return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for your objective';
    };
    
    // Transform to recommendation format
    return topFormats.map(format => ({
      id: format.id,
      name: format.name,
      type: 'format',
      confidence: Math.round(format.score),
      cost: format.baseCpm,
      reason: generateReason(format),
      metadata: {
        formatType: format.type,
        dimensions: format.dimensions,
        platform: format.platform,
        placement: format.placement,
        premium: format.premium,
        benchmarkCtr: format.benchmarkCtr,
        benchmarkVtr: format.benchmarkVtr,
        goal: format.goal
      }
    }));
    
  } catch (error) {
    console.error('[FORMAT RECOMMENDATIONS ERROR]:', error.message);
    
    // Fallback to hardcoded recommendations if API fails
    return [
      {
        id: 'ott-video-30s',
        name: 'OTT Video 30s',
        type: 'format',
        confidence: 90,
        cost: 48,
        reason: 'Video drives engagement and brand recall'
      },
      {
        id: 'social-video-15s',
        name: 'Social Video 15s',
        type: 'format',
        confidence: 88,
        cost: 9,
        reason: 'High reach and shareable content potential'
      },
      {
        id: 'display-banner',
        name: 'Display Banner',
        type: 'format',
        confidence: 82,
        cost: 6,
        reason: 'Cost-efficient reach and frequency'
      }
    ];
  }
}

function generateSiteRecommendations(brief) {
  return [
    {
      id: 'youtube',
      name: 'YouTube',
      type: 'site',
      confidence: 92,
      reach: 3500000,
      cost: 22,
      reason: 'Massive reach across Malaysia',
      stats: { type: 'OTT' }
    },
    {
      id: 'facebook',
      name: 'Facebook',
      type: 'site',
      confidence: 90,
      reach: 15000000,
      cost: 9,
      reason: 'Largest social platform in Malaysia',
      stats: { type: 'Social' }
    },
    {
      id: 'astro-go',
      name: 'Astro GO',
      type: 'site',
      confidence: 85,
      reach: 1200000,
      cost: 48,
      reason: 'Premium video content environment',
      stats: { type: 'OTT' }
    }
  ];
}

async function generateBudgetRecommendations(brief, currentSelections = {}) {
  const { campaign_objective = 'Awareness', budget_rm = 100000 } = brief;
  const { formats: selectedFormatIds = [] } = currentSelections;
  
  console.log('[BUDGET RECOMMENDATIONS] Selected formats:', selectedFormatIds);
  
  // If no formats selected, return generic recommendations
  if (!selectedFormatIds || selectedFormatIds.length === 0) {
    console.log('[BUDGET] No formats selected yet, returning generic recommendations');
    
    // Fetch real rate card data - Use specific platforms as defaults
    let videoCPM = 25; // KULT Video Everywhere (CPM Direct)
    let socialCPM = 9;  // TikTok & Meta video (CPM Direct)
    let displayCPM = 10; // Standard Banner (CPM Direct)
    
    try {
      const ratesResponse = await axios.get('http://localhost:5001/api/rates', { timeout: 3000 });
      const rates = ratesResponse.data?.data || [];
      
      const videoEverywhereRate = rates.find(r => r.Platform?.includes('KULT Video Everywhere'));
      if (videoEverywhereRate) {
        videoCPM = parseFloat(videoEverywhereRate['CPM Direct (RM)']) || 25;
      }
      
      const socialVideoRate = rates.find(r => 
        r.Platform?.includes('TikTok & Meta') && r.Description?.toLowerCase().includes('video')
      );
      if (socialVideoRate) {
        socialCPM = parseFloat(socialVideoRate['CPM Direct (RM)']) || 9;
      }
      
      const displayRate = rates.find(r => 
        r.Pillar === 'KULT: Display' && r.Description?.includes('Standard Banner')
      );
      if (displayRate) {
        displayCPM = parseFloat(displayRate['CPM Direct (RM)']) || 10;
      }
    } catch (error) {
      console.error('[BUDGET CPM ERROR] Using fallback rates:', error.message);
    }
    
    let videoPercent = 50;
    let socialPercent = 30;
    let displayPercent = 20;

    if (campaign_objective === 'Traffic') {
      videoPercent = 30;
      socialPercent = 40;
      displayPercent = 30;
    }

    const videoBudget = Math.round(budget_rm * (videoPercent / 100));
    const socialBudget = Math.round(budget_rm * (socialPercent / 100));
    const displayBudget = Math.round(budget_rm * (displayPercent / 100));

    return [
      {
        id: 'video',
        name: 'Video',
        type: 'budget',
        confidence: 90,
        weight: videoPercent,
        cost: videoBudget,
        cpm: videoCPM,
        reason: `Video content drives ${campaign_objective.toLowerCase()} and brand recall`,
        stats: { 
          impressions: Math.round((videoBudget / videoCPM) * 1000),
          cpm: videoCPM
        }
      },
      {
        id: 'social',
        name: 'Social',
        type: 'budget',
        confidence: 88,
        weight: socialPercent,
        cost: socialBudget,
        cpm: socialCPM,
        reason: 'High reach and shareable content potential',
        stats: { 
          impressions: Math.round((socialBudget / socialCPM) * 1000),
          cpm: socialCPM
        }
      },
      {
        id: 'display',
        name: 'Display',
        type: 'budget',
        confidence: 85,
        weight: displayPercent,
        cost: displayBudget,
        cpm: displayCPM,
        reason: 'Cost-efficient retargeting and frequency',
        stats: { 
          impressions: Math.round((displayBudget / displayCPM) * 1000),
          cpm: displayCPM
        }
      }
    ];
  }
  
  // Fetch selected formats' details from the formats API
  try {
    const formatsResponse = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
    const allFormats = formatsResponse.data?.data || [];
    
    // Filter to get only the selected formats
    const selectedFormats = allFormats.filter(f => selectedFormatIds.includes(f.id));
    
    if (selectedFormats.length === 0) {
      console.log('[BUDGET] Selected format IDs not found in database, returning generic');
      // Return generic if format IDs don't match
      return generateBudgetRecommendations(brief, {});
    }
    
    console.log(`[BUDGET] Found ${selectedFormats.length} selected formats with CPMs`);
    
    // Group formats by type and calculate average CPMs
    const formatGroups = {};
    selectedFormats.forEach(format => {
      const formatType = format.type || 'other';
      const formatTypeLower = formatType.toLowerCase();
      const formatName = (format.name || '').toLowerCase();
      
      // Categorize into Social, Video, Interactive, Display
      let category = 'Display';
      
      // CHECK SOCIAL FIRST (before video check, since "Video Social Ad" contains "video")
      if (formatName.includes('social ad') || formatName.includes('social video') || 
          formatName.includes('facebook') || formatName.includes('instagram') || formatName.includes('tiktok')) {
        category = 'Social';
      }
      // Then check Video
      else if (formatTypeLower.includes('video') || formatTypeLower.includes('instream')) {
        category = 'Video';
      } 
      // Then Interactive
      else if (formatTypeLower.includes('interactive') || formatTypeLower.includes('high impact')) {
        category = 'Interactive';
      }
      // Default: Display
      
      if (!formatGroups[category]) {
        formatGroups[category] = {
          formats: [],
          totalCpm: 0,
          count: 0
        };
      }
      
      formatGroups[category].formats.push(format);
      formatGroups[category].totalCpm += format.baseCpm || 10;
      formatGroups[category].count++;
    });
    
    // Calculate budget split based on selected formats
    const recommendations = [];
    const totalFormats = selectedFormats.length;
    
    for (const [category, data] of Object.entries(formatGroups)) {
      const avgCpm = data.totalCpm / data.count;
      const weight = Math.round((data.count / totalFormats) * 100);
      const budgetAllocation = Math.round(budget_rm * (weight / 100));
      const impressions = Math.round((budgetAllocation / avgCpm) * 1000);
      
      // Create reason based on formats and category
      const formatNames = data.formats.slice(0, 2).map(f => f.name).join(', ');
      let reason = data.formats.length > 2 
        ? `Based on ${formatNames} and ${data.formats.length - 2} more selected formats`
        : `Based on selected ${formatNames}`;
      
      // Add category-specific reasoning
      if (category === 'Social') {
        reason = `Based on selected ${formatNames} - Ideal for Facebook, Instagram, TikTok`;
      } else if (category === 'Video') {
        reason = data.formats.length > 1 
          ? `Based on ${formatNames} and ${data.formats.length - 2} more video formats`
          : `Based on selected ${formatNames}`;
      }
      
      recommendations.push({
        id: category.toLowerCase(),
        name: category,
        type: 'budget',
        confidence: 95, // High confidence since based on user selections
        weight,
        cost: budgetAllocation,
        cpm: Math.round(avgCpm),
        reason,
        formats: data.formats.map(f => ({ id: f.id, name: f.name, cpm: f.baseCpm })),
        stats: { 
          impressions,
          cpm: Math.round(avgCpm)
        }
      });
      
      console.log(`[BUDGET REC] ${category}: avgCpm=${avgCpm}, rounded=${Math.round(avgCpm)}, cost=${budgetAllocation}`);
    }
    
    // Sort by budget allocation (descending)
    recommendations.sort((a, b) => b.cost - a.cost);
    
    console.log(`[BUDGET] Generated ${recommendations.length} format-based recommendations`);
    return recommendations;
    
  } catch (error) {
    console.error('[BUDGET RECOMMENDATIONS ERROR]:', error.message);
    // Fallback to generic recommendations
    return generateBudgetRecommendations(brief, {});
  }
}

/**
 * Generate Campaign Analysis (Step 5: Overview)
 * Analyzes the complete campaign plan and provides insights
 * Now uses V2 intent-based logic
 */
async function generateOverviewRecommendations(brief, currentSelections = {}) {
  // Use V2 intent-based strategic evaluation
  return await generateOverviewRecommendationsV2(brief, currentSelections);
}

/**
 * LEGACY: Generate Campaign Analysis (Step 5: Overview) - OLD VERSION
 * Kept for reference, replaced by V2
 */
async function generateOverviewRecommendationsLegacy(brief, currentSelections = {}) {
  const { 
    campaign_objective = 'Awareness', 
    budget_rm = 100000,
    industry = 'retail_ecommerce'
  } = brief;
  
  const { 
    audiences = [], 
    formats = [], 
    sites = [] 
  } = currentSelections;
  
  console.log('[OVERVIEW ANALYSIS] Analyzing campaign plan:', {
    objective: campaign_objective,
    budget: budget_rm,
    audiences: audiences.length,
    formats: formats.length,
    sites: sites.length
  });
  
  const recommendations = [];
  
  // Calculate Campaign Health Score (0-100)
  let healthScore = 50; // Base score
  
  // Scoring factors
  if (audiences.length >= 2) healthScore += 15; // Good audience targeting
  else if (audiences.length === 1) healthScore += 8;
  
  if (formats.length >= 3) healthScore += 15; // Good format diversity
  else if (formats.length >= 2) healthScore += 10;
  else if (formats.length === 1) healthScore += 5;
  
  if (sites.length >= 5) healthScore += 10; // Good site coverage
  else if (sites.length >= 3) healthScore += 7;
  else if (sites.length >= 1) healthScore += 4;
  
  if (budget_rm >= 100000) healthScore += 10; // Adequate budget
  else if (budget_rm >= 50000) healthScore += 5;
  
  // Cap at 100
  healthScore = Math.min(healthScore, 100);
  
  // 1. Campaign Health Score
  recommendations.push({
    id: 'health-score',
    name: 'Campaign Health Score',
    type: 'overview',
    subtype: 'health',
    confidence: healthScore,
    score: healthScore,
    reason: healthScore >= 80 
      ? 'Excellent campaign structure with strong targeting and diverse formats'
      : healthScore >= 60
      ? 'Good campaign foundation, with room for optimization'
      : 'Campaign needs more targeting and format diversity',
    icon: 'chart',
    color: healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'orange'
  });
  
  // 2. Strengths Analysis
  const strengths = [];
  
  if (audiences.length >= 2) {
    strengths.push({
      title: 'Strong Audience Targeting',
      description: `${audiences.length} targeted personas ensure precise reach`
    });
  }
  
  if (formats.length >= 3) {
    strengths.push({
      title: 'Format Diversity',
      description: `${formats.length} formats provide multi-touchpoint engagement`
    });
  }
  
  if (budget_rm >= 100000) {
    strengths.push({
      title: 'Adequate Budget',
      description: `RM ${(budget_rm / 1000).toFixed(0)}k enables effective frequency and reach`
    });
  }
  
  if (campaign_objective.toLowerCase().includes('awareness') && formats.length >= 2) {
    strengths.push({
      title: 'Awareness-Optimized',
      description: 'Format mix aligns well with awareness objectives'
    });
  }
  
  if (strengths.length > 0) {
    recommendations.push({
      id: 'strengths',
      name: 'Campaign Strengths',
      type: 'overview',
      subtype: 'strengths',
      confidence: 95,
      items: strengths,
      reason: `${strengths.length} key strengths identified in your campaign plan`,
      icon: 'check',
      color: 'green'
    });
  }
  
  // 3. Risk Analysis & Warnings
  const risks = [];
  
  if (audiences.length === 0) {
    risks.push({
      level: 'high',
      title: 'No Audience Selected',
      description: 'Campaign lacks targeted personas - may result in wasted spend',
      action: 'Add at least 2 audience personas in Step 2'
    });
  } else if (audiences.length === 1) {
    risks.push({
      level: 'medium',
      title: 'Limited Audience Reach',
      description: 'Single persona may limit campaign scale',
      action: 'Consider adding 1-2 more audience segments'
    });
  }
  
  if (formats.length === 1) {
    risks.push({
      level: 'medium',
      title: 'Single Format Risk',
      description: 'One format limits engagement opportunities',
      action: 'Add complementary formats for better performance'
    });
  }
  
  if (sites.length < 3) {
    risks.push({
      level: 'medium',
      title: 'Limited Site Coverage',
      description: 'Few sites may restrict reach potential',
      action: 'Add more sites or enable AI-optimized groups'
    });
  }
  
  if (budget_rm < 50000) {
    risks.push({
      level: 'high',
      title: 'Budget Below Threshold',
      description: 'Budget may be insufficient for effective frequency',
      action: 'Consider increasing budget to at least RM 50k'
    });
  }
  
  if (risks.length > 0) {
    recommendations.push({
      id: 'risks',
      name: 'Risk Analysis',
      type: 'overview',
      subtype: 'risks',
      confidence: 90,
      items: risks,
      reason: `${risks.length} potential risk${risks.length > 1 ? 's' : ''} detected`,
      icon: 'warning',
      color: 'orange'
    });
  }
  
  // 4. Optimization Suggestions
  const optimizations = [];
  
  // Check for missing social presence
  const hasSocial = formats.some(fmtId => {
    const fmtIdLower = (fmtId || '').toLowerCase();
    return fmtIdLower.includes('social');
  });
  
  if (!hasSocial && campaign_objective.toLowerCase().includes('awareness')) {
    optimizations.push({
      title: 'Add Social Formats',
      description: 'Social ads (RM 5-9 CPM) can boost awareness cost-effectively',
      impact: 'high',
      effort: 'low'
    });
  }
  
  // Check for video presence
  const hasVideo = formats.some(fmtId => {
    const fmtIdLower = (fmtId || '').toLowerCase();
    return fmtIdLower.includes('video');
  });
  
  if (!hasVideo) {
    optimizations.push({
      title: 'Include Video Formats',
      description: 'Video drives 3x higher engagement for awareness campaigns',
      impact: 'high',
      effort: 'medium'
    });
  }
  
  // Check for interactive formats
  const hasInteractive = formats.some(fmtId => {
    const fmtIdLower = (fmtId || '').toLowerCase();
    return fmtIdLower.includes('interactive') || fmtIdLower.includes('quiz') || 
           fmtIdLower.includes('game') || fmtIdLower.includes('capture');
  });
  
  if (!hasInteractive && campaign_objective.toLowerCase().includes('lead')) {
    optimizations.push({
      title: 'Add Interactive Lead Formats',
      description: 'Data capture formats can boost lead generation by 40%',
      impact: 'high',
      effort: 'medium'
    });
  }
  
  // Budget allocation suggestion
  if (formats.length >= 3 && budget_rm >= 100000) {
    optimizations.push({
      title: 'Test Budget Splits',
      description: 'Consider 60/30/10 rule: allocate 60% to top performer, 30% to support, 10% to testing',
      impact: 'medium',
      effort: 'low'
    });
  }
  
  if (optimizations.length > 0) {
    recommendations.push({
      id: 'optimizations',
      name: 'Optimization Opportunities',
      type: 'overview',
      subtype: 'optimizations',
      confidence: 85,
      items: optimizations,
      reason: `${optimizations.length} optimization${optimizations.length > 1 ? 's' : ''} to enhance campaign performance`,
      icon: 'lightbulb',
      color: 'purple'
    });
  }
  
  // 5. Expected Performance Metrics
  // Calculate estimated metrics based on selections
  let estimatedReach = 0;
  let estimatedImpressions = 0;
  let estimatedCTR = 0.3; // Base CTR
  
  // Estimate impressions based on budget and average CPM
  const avgCPM = 15; // Average CPM assumption
  estimatedImpressions = Math.round((budget_rm / avgCPM) * 1000);
  
  // Estimate reach (typically 60-70% of impressions for unique users)
  estimatedReach = Math.round(estimatedImpressions * 0.65);
  
  // Adjust CTR based on formats
  if (hasInteractive) estimatedCTR += 0.5; // Interactive boosts CTR
  if (hasVideo) estimatedCTR += 0.2; // Video boosts CTR
  if (hasSocial) estimatedCTR += 0.15; // Social boosts CTR
  
  const estimatedClicks = Math.round(estimatedImpressions * (estimatedCTR / 100));
  
  recommendations.push({
    id: 'metrics',
    name: 'Expected Performance',
    type: 'overview',
    subtype: 'metrics',
    confidence: 80,
    metrics: {
      reach: estimatedReach,
      impressions: estimatedImpressions,
      ctr: estimatedCTR.toFixed(2) + '%',
      clicks: estimatedClicks,
      cpm: avgCPM
    },
    reason: 'Projected performance based on KULT benchmarks and industry standards',
    icon: 'chart-bar',
    color: 'cyan'
  });
  
  console.log(`[OVERVIEW] Generated ${recommendations.length} campaign analysis insights`);
  return recommendations;
}

export default router;
