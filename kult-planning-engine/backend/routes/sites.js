import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * GET /api/sites
 * Returns curated site recommendations based on real inventory data
 */
router.get('/', async (req, res) => {
  try {
    // Fetch real inventory data
    const inventoryResponse = await axios.get('http://localhost:5001/api/inventory');
    const inventoryData = inventoryResponse.data.data || [];

    // Group by site (IP field) and aggregate stats
    const siteMap = {};
    
    inventoryData.forEach(item => {
      const siteName = item.IP;
      const property = item.Property;
      const entity = item.Entity;
      const month = item['Month and year']; // Track months for averaging
      const language = item.Language; // Language support
      
      if (!siteMap[siteName]) {
        siteMap[siteName] = {
          id: siteName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          name: siteName.charAt(0).toUpperCase() + siteName.slice(1), // Capitalize first letter
          category: mapPropertyToCategory(property),
          property: property,
          entity: entity,
          formats: new Set(),
          languages: new Set(), // Track supported languages
          monthlyData: {}, // Track impressions per month
          totalImpressions: 0,
          totalRequests: 0,
          tags: []
        };
      }
      
      // Aggregate formats
      if (item.Format) {
        siteMap[siteName].formats.add(item.Format);
      }
      
      // Aggregate languages
      if (language && language !== '#n/a') {
        siteMap[siteName].languages.add(language);
      }
      
      // Aggregate stats per month (to calculate average later)
      if (month) {
        if (!siteMap[siteName].monthlyData[month]) {
          siteMap[siteName].monthlyData[month] = {
            impressions: 0,
            requests: 0
          };
        }
        siteMap[siteName].monthlyData[month].impressions += item['Total impressions'] || 0;
        siteMap[siteName].monthlyData[month].requests += item['Total ad requests'] || 0;
      }
      
      // Also keep total for fill rate calculation
      siteMap[siteName].totalImpressions += item['Total impressions'] || 0;
      siteMap[siteName].totalRequests += item['Total ad requests'] || 0;
    });

    // Convert to array and enrich with metadata
    const sites = Object.values(siteMap).map(site => {
      // Convert Set to Array
      site.formats = Array.from(site.formats);
      site.languages = Array.from(site.languages);
      
      // Calculate average monthly impressions
      const months = Object.keys(site.monthlyData);
      const monthCount = months.length;
      site.avgMonthlyImpressions = monthCount > 0 
        ? Math.round(site.totalImpressions / monthCount)
        : site.totalImpressions;
      
      // Calculate average monthly requests
      site.avgMonthlyRequests = monthCount > 0
        ? Math.round(site.totalRequests / monthCount)
        : site.totalRequests;
      
      // Calculate AVAILABLE impressions (unsold inventory)
      // Formula: Available = Requests - Served Impressions
      const rawAvailableImpressions = site.avgMonthlyRequests - site.avgMonthlyImpressions;
      
      // Apply 75% buffer for realistic projections (similar to Step 3 format buffering)
      // Only show 25% of available inventory for conservative planning
      site.avgMonthlyAvailableImpressions = Math.round(rawAvailableImpressions * 0.25);
      
      // Special categorization: Sooka is a streaming platform (OTT), not Web
      if (site.name.toLowerCase().includes('sooka')) {
        site.category = 'OTT';
      }
      
      // Generate tags based on site characteristics
      site.tags = generateTags(site);
      
      // Add description
      site.description = generateDescription(site);
      
      // Add icon
      site.icon = getIcon(site.category, site.name);
      
      // Format traffic (use buffered AVAILABLE impressions for realistic projections)
      site.traffic = formatTraffic(site.avgMonthlyAvailableImpressions);
      
      // Calculate fill rate (use averages for more accurate rate)
      const fillRate = site.avgMonthlyRequests > 0 
        ? ((site.avgMonthlyImpressions / site.avgMonthlyRequests) * 100).toFixed(1)
        : 0;
      site.fillRate = parseFloat(fillRate);
      
      return site;
    });

    // Sort by average monthly AVAILABLE impressions (descending - unsold inventory)
    sites.sort((a, b) => b.avgMonthlyAvailableImpressions - a.avgMonthlyAvailableImpressions);

    // Group by category
    const groupedSites = {
      OTT: sites.filter(s => s.category === 'OTT'),
      Web: sites.filter(s => s.category === 'Web'),
      Social: sites.filter(s => s.category === 'Social')
    };

    res.json({
      success: true,
      data: groupedSites,
      allSites: sites,
      total: sites.length
    });

  } catch (error) {
    console.error('Error fetching sites:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sites data',
      message: error.message
    });
  }
});

/**
 * Map inventory Property to display category
 */
function mapPropertyToCategory(property) {
  const mapping = {
    'OTT': 'OTT',
    'Web & app': 'Web',
    'Social': 'Social'
  };
  return mapping[property] || 'Web';
}

/**
 * Generate tags based on site characteristics
 */
function generateTags(site) {
  const tags = [];
  
  // Category tag
  tags.push(site.category);
  
  // Entity-based tags
  if (site.entity === 'Youtube') {
    tags.push('Video', 'Global Reach');
  } else if (site.entity === 'Mbns' || site.entity === 'Aasb' || site.entity === 'Nisb' || site.entity === 'Arsb') {
    tags.push('Local Content');
  }
  
  // Format-based tags
  if (site.formats.some(f => f.includes('roll'))) {
    tags.push('Video Ads');
  }
  if (site.formats.some(f => f.includes('Masthead') || f.includes('Leaderboard'))) {
    tags.push('Display');
  }
  if (site.formats.some(f => f.includes('Interstitial'))) {
    tags.push('High Impact');
  }
  
  // Content-based tags (from site names)
  const nameLower = site.name.toLowerCase();
  if (nameLower.includes('sport') || nameLower.includes('stadium')) {
    tags.push('Sports');
  }
  if (nameLower.includes('news') || nameLower.includes('awani')) {
    tags.push('News');
  }
  if (nameLower.includes('wanita') || nameLower.includes('nona') || nameLower.includes('impiana')) {
    tags.push('Lifestyle');
  }
  if (nameLower.includes('music') || nameLower.includes('era') || nameLower.includes('mix') || nameLower.includes('hitz')) {
    tags.push('Entertainment');
  }
  
  // Performance tags
  if (site.fillRate > 50) {
    tags.push('High Fill Rate');
  }
  if (site.totalImpressions > 100000000) {
    tags.push('Premium');
  }
  
  // Language tags
  if (site.languages) {
    site.languages.forEach(lang => {
      if (lang === 'Bahasa malaysia') tags.push('Bahasa Malaysia');
      if (lang === 'English') tags.push('English');
      if (lang === 'Chinese') tags.push('Chinese');
      if (lang === 'Multi-langauge') tags.push('Multi-Language');
    });
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Generate description based on site characteristics
 */
function generateDescription(site) {
  const descriptions = {
    'astro_go': 'Premium OTT platform with live TV and on-demand content',
    'youtube': 'Global video platform with massive reach',
    'stadium_astro': 'Sports content platform for football and EPL fans',
    'awani': 'Leading news and current affairs platform',
    'gempak': 'Youth-focused entertainment and trending content',
    'sooka': 'Streaming platform with movies and series',
    'mingguan_wanita': 'Women\'s lifestyle and fashion content',
    'media_hiburan': 'Entertainment news and celebrity content',
    'rasa': 'Food, recipes, and lifestyle content'
  };
  
  return descriptions[site.id] || `${site.category} property with ${site.traffic} monthly impressions`;
}

/**
 * Get icon for category or specific site
 */
function getIcon(category, siteName = '') {
  const siteNameLower = siteName.toLowerCase();
  
  // Specific site icons
  if (siteNameLower.includes('youtube')) {
    return 'youtube';
  }
  
  // Category icons
  const icons = {
    'OTT': 'tv',
    'Web': 'globe',
    'Social': 'users'
  };
  return icons[category] || 'globe';
}

/**
 * Format traffic numbers
 */
function formatTraffic(impressions) {
  if (impressions >= 1000000) {
    return `${(impressions / 1000000).toFixed(1)}M`;
  } else if (impressions >= 1000) {
    return `${(impressions / 1000).toFixed(0)}K`;
  }
  return impressions.toString();
}

export default router;
