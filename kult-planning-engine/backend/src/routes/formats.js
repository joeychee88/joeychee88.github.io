/**
 * Formats API
 * Fetches and parses ad format data from Google Sheets CSV in real-time
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Google Sheet CSV URL for Ad Formats
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1dYylynygKbRb1NNwWQodZGG78m3jYf8BiPsJPGXp3Dg/export?format=csv';

// Cache configuration
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Parse CSV line respecting quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV string to formats array
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV has no data rows');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  console.log('CSV Headers:', headers);

  // Find column indices (case-insensitive)
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('format name') || h.toLowerCase() === 'name');
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type' || h.toLowerCase() === 'format type');
  const dimensionsIdx = headers.findIndex(h => h.toLowerCase() === 'dimensions');
  const descriptionIdx = headers.findIndex(h => h.toLowerCase() === 'description');
  const cpmIdx = headers.findIndex(h => h.toLowerCase().includes('cpm'));
  const premiumIdx = headers.findIndex(h => h.toLowerCase() === 'premium');
  const platformIdx = headers.findIndex(h => h.toLowerCase() === 'platform');
  const placementIdx = headers.findIndex(h => h.toLowerCase() === 'placement');
  const activeIdx = headers.findIndex(h => h.toLowerCase() === 'active');
  const benchmarkCtrIdx = headers.findIndex(h => h.toLowerCase().includes('benchmark ctr'));
  const benchmarkVtrIdx = headers.findIndex(h => h.toLowerCase().includes('benchmark vtr'));
  const demoUrlIdx = headers.findIndex(h => h.toLowerCase() === 'demo' || h.toLowerCase().includes('demo url'));
  const goalIdx = headers.findIndex(h => h.toLowerCase() === 'goal');
  const industryIdx = headers.findIndex(h => h.toLowerCase().includes('industry') || h.toLowerCase().includes('use case'));

  if (nameIdx === -1 || typeIdx === -1 || cpmIdx === -1) {
    throw new Error('Required columns not found (Format Name, Type, Base CPM)');
  }

  // Parse data rows
  const formats = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(cell => cell.replace(/^"|"$/g, '').trim());
    
    const name = row[nameIdx];
    
    // Skip empty rows or rows without name
    if (!name || name.trim() === '') {
      continue;
    }

    // Get values
    const type = typeIdx >= 0 ? row[typeIdx].toLowerCase() : 'display';
    const dimensions = dimensionsIdx >= 0 ? row[dimensionsIdx] : '';
    const description = descriptionIdx >= 0 ? row[descriptionIdx] : '';
    const cpmStr = row[cpmIdx] || '0';
    const premiumStr = premiumIdx >= 0 ? row[premiumIdx] : 'FALSE';
    const platform = platformIdx >= 0 ? row[platformIdx] : '';
    const placement = placementIdx >= 0 ? row[placementIdx] : '';
    const activeStr = activeIdx >= 0 ? row[activeIdx] : 'TRUE';
    const benchmarkCtrStr = benchmarkCtrIdx >= 0 ? row[benchmarkCtrIdx] : '';
    const benchmarkVtrStr = benchmarkVtrIdx >= 0 ? row[benchmarkVtrIdx] : '';
    const demoUrl = demoUrlIdx >= 0 ? row[demoUrlIdx] : '';
    const goal = goalIdx >= 0 ? row[goalIdx] : '';
    const industry = industryIdx >= 0 ? row[industryIdx] : '';

    // Parse CPM (remove quotes, "RM", commas)
    const baseCpm = parseFloat(cpmStr.replace(/[",RM]/g, '')) || 0;
    
    // Parse boolean values
    const premium = premiumStr.toUpperCase() === 'TRUE' || premiumStr.toUpperCase() === 'YES';
    const active = activeStr.toUpperCase() !== 'FALSE' && activeStr.toUpperCase() !== 'NO';

    // Apply CPM overrides for specific formats
    let finalCpm = baseCpm;
    const nameLower = name.toLowerCase().trim();
    
    // Social format CPM overrides
    if (nameLower === 'image social ad') {
      finalCpm = 5; // Override: RM 5 for Image Social Ad
    } else if (nameLower === 'video social ad') {
      finalCpm = 9; // Override: RM 9 for Video Social Ad
    }
    
    formats.push({
      id: `fmt_${i}`,
      name: name.trim(),
      type: type.trim(),
      dimensions: dimensions.trim(),
      description: description.trim(),
      baseCpm: finalCpm,
      premium,
      platform: platform.trim(),
      placement: placement.trim(),
      active,
      benchmarkCtr: benchmarkCtrStr.trim(),
      benchmarkVtr: benchmarkVtrStr.trim(),
      demoUrl: demoUrl.trim(),
      goal: goal.trim(),
      industry: industry.trim()
    });
  }

  console.log(`Parsed ${formats.length} ad formats`);
  
  // Get unique types for breakdown
  const types = [...new Set(formats.map(item => item.type))];
  const typeBreakdown = {};
  
  types.forEach(type => {
    const items = formats.filter(item => item.type === type);
    typeBreakdown[type] = items.length;
  });

  console.log('Format Type Breakdown:', typeBreakdown);

  // Calculate statistics
  const stats = {
    total: formats.length,
    premium: formats.filter(f => f.premium).length,
    active: formats.filter(f => f.active).length,
    avgCpm: formats.length > 0 
      ? parseFloat((formats.reduce((sum, f) => sum + f.baseCpm, 0) / formats.length).toFixed(2))
      : 0,
    types: types.length
  };

  return {
    formats,
    types,
    breakdown: typeBreakdown,
    stats
  };
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheetData() {
  try {
    console.log('Fetching ad formats from Google Sheets...');
    const response = await axios.get(GOOGLE_SHEET_CSV_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'KULT-Planning-Engine/1.0'
      }
    });

    console.log('Google Sheets response received, parsing CSV...');
    const parsed = parseCSV(response.data);
    
    // Update cache
    cachedData = parsed;
    cacheTimestamp = Date.now();
    
    console.log('Formats cache updated successfully');
    return parsed;
  } catch (error) {
    console.error('Error fetching Google Sheet:', error.message);
    
    // Return cached data if available
    if (cachedData) {
      console.log('Returning cached data due to fetch error');
      return cachedData;
    }
    
    throw error;
  }
}

/**
 * Get cached data or fetch fresh data
 */
async function getFormatsData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached formats data');
    return {
      ...cachedData,
      cached: true,
      cacheAge: Math.round((now - cacheTimestamp) / 1000)
    };
  }
  
  // Fetch fresh data
  console.log('Cache expired or empty, fetching fresh formats data...');
  const data = await fetchGoogleSheetData();
  return {
    ...data,
    cached: false,
    cacheAge: 0
  };
}

/**
 * GET /api/formats
 * Returns all ad format data
 * Query params:
 *   - skipCache: if true, forces fresh data fetch from Google Sheets
 */
router.get('/', async (req, res) => {
  try {
    const skipCache = req.query.skipCache === 'true';
    
    let data;
    if (skipCache) {
      console.log('skipCache=true - forcing fresh data fetch');
      cachedData = null;
      cacheTimestamp = null;
      data = await fetchGoogleSheetData();
      data.cached = false;
      data.cacheAge = 0;
    } else {
      data = await getFormatsData();
    }
    
    res.json({
      success: true,
      count: data.formats.length,
      data: data.formats,
      types: data.types,
      breakdown: data.breakdown,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge,
      lastUpdated: new Date(cacheTimestamp || Date.now()).toISOString(),
      metadata: {
        source: 'Google Sheets CSV',
        sheetId: '1dYylynygKbRb1NNwWQodZGG78m3jYf8BiPsJPGXp3Dg',
        type: 'ad_formats'
      }
    });
  } catch (error) {
    console.error('Error in /api/formats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ad formats',
      message: error.message
    });
  }
});

/**
 * GET /api/formats/types
 * Returns list of unique format types
 */
router.get('/types', async (req, res) => {
  try {
    const data = await getFormatsData();
    
    res.json({
      success: true,
      count: data.types.length,
      data: data.types,
      breakdown: data.breakdown
    });
  } catch (error) {
    console.error('Error in /api/formats/types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch format types',
      message: error.message
    });
  }
});

/**
 * GET /api/formats/stats
 * Returns format statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const data = await getFormatsData();
    
    res.json({
      success: true,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge
    });
  } catch (error) {
    console.error('Error in /api/formats/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch format stats',
      message: error.message
    });
  }
});

/**
 * POST /api/formats/filter
 * Filter formats by type, premium, platform, active status
 */
router.post('/filter', async (req, res) => {
  try {
    const { type, premium, platform, active } = req.body;
    
    const data = await getFormatsData();
    let results = [...data.formats];
    
    // Apply filters
    if (type && type !== 'all') {
      results = results.filter(item => item.type === type.toLowerCase());
    }
    
    if (premium !== undefined && premium !== null) {
      results = results.filter(item => item.premium === premium);
    }
    
    if (platform && platform !== 'all') {
      results = results.filter(item => item.platform === platform);
    }
    
    if (active !== undefined && active !== null) {
      results = results.filter(item => item.active === active);
    }

    res.json({
      success: true,
      count: results.length,
      data: results,
      filters: { type, premium, platform, active }
    });
  } catch (error) {
    console.error('Error in /api/formats/filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter formats',
      message: error.message
    });
  }
});

/**
 * POST /api/formats/refresh
 * Force refresh cache
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('Manual refresh requested for formats');
    cachedData = null;
    cacheTimestamp = null;
    
    const data = await fetchGoogleSheetData();
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: data.formats.length,
      types: data.types.length,
      breakdown: data.breakdown,
      stats: data.stats
    });
  } catch (error) {
    console.error('Error in /api/formats/refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
});

export default router;
