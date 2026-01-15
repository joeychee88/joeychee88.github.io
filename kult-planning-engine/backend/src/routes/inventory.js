/**
 * Inventory API
 * Fetches and parses site inventory data from Google Sheets CSV in real-time
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Google Sheet CSV URL for Site Inventory
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1FCBX0EDhPmPSe4-AjbuwxoDQwkLGuyBd8IrLYbnQ4xM/export?format=csv';

// Cache configuration
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Convert text to sentence case
 */
function toSentenceCase(text) {
  if (!text) return '';
  const str = text.toString().toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format month - remove year, keep only month name
 */
function formatMonth(monthStr) {
  if (!monthStr) return '';
  
  // Handle various formats: "January 2024", "Jan-24", "2024-01", etc.
  const monthStr2 = monthStr.toString().trim();
  
  // Extract month name or number
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Check if it contains a full month name
  for (const month of monthNames) {
    if (monthStr2.toLowerCase().includes(month.toLowerCase())) {
      return month;
    }
  }
  
  // Check if it contains abbreviated month
  for (let i = 0; i < monthAbbr.length; i++) {
    if (monthStr2.toLowerCase().includes(monthAbbr[i].toLowerCase())) {
      return monthNames[i];
    }
  }
  
  // If it's a number (1-12), convert to month name
  const monthNum = parseInt(monthStr2);
  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    return monthNames[monthNum - 1];
  }
  
  // Default: return as is, capitalized
  return toSentenceCase(monthStr2.split(/[-\s]/)[0]);
}

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
 * Parse CSV string to inventory array
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV has no data rows');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  console.log('CSV Headers:', headers);

  // Map headers to expected fields (case-insensitive)
  const headerMap = {};
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();
    headerMap[lowerHeader] = index;
  });

  // Parse data rows
  const inventory = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(cell => cell.replace(/^"|"$/g, '').trim());
    
    // Skip empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    // Extract data with sentence case formatting
    const rowData = {};
    
    headers.forEach((header, index) => {
      const value = row[index] || '';
      const lowerHeader = header.toLowerCase();
      
      // Special handling for month field
      if (lowerHeader.includes('month')) {
        rowData[header] = formatMonth(value);
      }
      // Special handling for numeric fields
      else if (lowerHeader.includes('requests') || lowerHeader.includes('impressions') || 
               lowerHeader.includes('rate') || lowerHeader.includes('revenue') ||
               lowerHeader.includes('cpm') || lowerHeader.includes('fill')) {
        // Remove commas and parse as number
        const numValue = parseFloat(value.replace(/,/g, '')) || 0;
        rowData[header] = numValue;
      }
      // Convert text fields to sentence case
      else {
        // Special case: Check for OTT before sentence case
        if (value.toString().toLowerCase().trim() === 'ott') {
          rowData[header] = 'OTT';
        } else {
          rowData[header] = toSentenceCase(value);
        }
      }
    });
    
    inventory.push({
      id: `inv_${i}`,
      ...rowData
    });
  }

  console.log(`Parsed ${inventory.length} inventory records`);

  // Calculate statistics
  const stats = calculateStats(inventory, headers);

  return {
    inventory,
    headers,
    stats
  };
}

/**
 * Calculate statistics from inventory data
 */
function calculateStats(inventory, headers) {
  if (inventory.length === 0) return {};
  
  const stats = {
    totalEntries: inventory.length
  };
  
  // Calculate sums and averages for numeric columns
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('requests') || lowerHeader.includes('impressions') || 
        lowerHeader.includes('revenue') || lowerHeader.includes('cpm')) {
      
      const sum = inventory.reduce((acc, item) => {
        const value = parseFloat(item[header]) || 0;
        return acc + value;
      }, 0);
      
      const avg = sum / inventory.length;
      
      stats[`total_${header}`] = Math.round(sum);
      stats[`avg_${header}`] = parseFloat(avg.toFixed(2));
    }
    
    if (lowerHeader.includes('rate') && lowerHeader.includes('fill')) {
      const sum = inventory.reduce((acc, item) => {
        const value = parseFloat(item[header]) || 0;
        return acc + value;
      }, 0);
      
      const avg = sum / inventory.length;
      stats[`avg_${header}`] = parseFloat(avg.toFixed(2));
    }
  });
  
  // Get unique values for categorical fields
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('property') || lowerHeader.includes('site') || 
        lowerHeader.includes('format') || lowerHeader.includes('device')) {
      const unique = [...new Set(inventory.map(item => item[header]).filter(v => v))];
      stats[`unique_${header}`] = unique.length;
      stats[`${header}_list`] = unique;
    }
  });
  
  return stats;
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheetData() {
  try {
    console.log('Fetching inventory data from Google Sheets...');
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
    
    console.log('Inventory cache updated successfully');
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
async function getInventoryData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached inventory data');
    return {
      ...cachedData,
      cached: true,
      cacheAge: Math.round((now - cacheTimestamp) / 1000)
    };
  }
  
  // Fetch fresh data
  console.log('Cache expired or empty, fetching fresh inventory data...');
  const data = await fetchGoogleSheetData();
  return {
    ...data,
    cached: false,
    cacheAge: 0
  };
}

/**
 * GET /api/inventory
 * Returns all inventory data
 */
router.get('/', async (req, res) => {
  try {
    const data = await getInventoryData();
    
    res.json({
      success: true,
      count: data.inventory.length,
      data: data.inventory,
      headers: data.headers,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge,
      lastUpdated: new Date(cacheTimestamp || Date.now()).toISOString(),
      metadata: {
        source: 'Google Sheets CSV',
        sheetId: '1FCBX0EDhPmPSe4-AjbuwxoDQwkLGuyBd8IrLYbnQ4xM',
        type: 'site_inventory'
      }
    });
  } catch (error) {
    console.error('Error in /api/inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory data',
      message: error.message
    });
  }
});

/**
 * GET /api/inventory/stats
 * Returns inventory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const data = await getInventoryData();
    
    res.json({
      success: true,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge
    });
  } catch (error) {
    console.error('Error in /api/inventory/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory stats',
      message: error.message
    });
  }
});

/**
 * POST /api/inventory/refresh
 * Force refresh cache
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('Manual refresh requested for inventory');
    cachedData = null;
    cacheTimestamp = null;
    
    const data = await fetchGoogleSheetData();
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: data.inventory.length,
      stats: data.stats
    });
  } catch (error) {
    console.error('Error in /api/inventory/refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
});

/**
 * GET /api/inventory/by-format
 * Aggregate inventory data by format and language for budget validation
 */
router.get('/by-format', async (req, res) => {
  try {
    // Fetch all inventory data (from cache if available)
    const data = await getInventoryData();
    const inventoryData = data.inventory;
    
    if (!inventoryData || inventoryData.length === 0) {
      return res.status(500).json({ 
        success: false, 
        error: 'No inventory data available' 
      });
    }

    // Aggregate by format and language
    const formatAggregation = {};
    
    inventoryData.forEach(row => {
      const format = row.Format || 'Unknown';
      const language = row.Language || 'Unknown';
      const requests = parseInt(row['Total ad requests']) || 0;
      const impressions = parseInt(row['Total impressions']) || 0;
      const property = row.Property || 'Unknown';
      
      // Create format key
      const formatKey = format.toLowerCase();
      
      if (!formatAggregation[formatKey]) {
        formatAggregation[formatKey] = {
          formatName: format,
          totalRequests: 0,
          totalImpressions: 0,
          byLanguage: {},
          byProperty: {},
          entryCount: 0
        };
      }
      
      // Aggregate totals
      formatAggregation[formatKey].totalRequests += requests;
      formatAggregation[formatKey].totalImpressions += impressions;
      formatAggregation[formatKey].entryCount += 1;
      
      // Aggregate by language
      const langKey = language.toLowerCase();
      if (!formatAggregation[formatKey].byLanguage[langKey]) {
        formatAggregation[formatKey].byLanguage[langKey] = {
          language: language,
          totalRequests: 0,
          totalImpressions: 0
        };
      }
      formatAggregation[formatKey].byLanguage[langKey].totalRequests += requests;
      formatAggregation[formatKey].byLanguage[langKey].totalImpressions += impressions;
      
      // Aggregate by property (OTT, Web, Social)
      const propKey = property.toLowerCase();
      if (!formatAggregation[formatKey].byProperty[propKey]) {
        formatAggregation[formatKey].byProperty[propKey] = {
          property: property,
          totalRequests: 0,
          totalImpressions: 0
        };
      }
      formatAggregation[formatKey].byProperty[propKey].totalRequests += requests;
      formatAggregation[formatKey].byProperty[propKey].totalImpressions += impressions;
    });

    // Calculate monthly averages (assuming data covers 12 months)
    // Group by month to count unique months per format
    const monthsPerFormat = {};
    inventoryData.forEach(row => {
      const format = (row.Format || 'Unknown').toLowerCase();
      const month = row['Month and year'] || '';
      if (!monthsPerFormat[format]) {
        monthsPerFormat[format] = new Set();
      }
      if (month) {
        monthsPerFormat[format].add(month.toLowerCase());
      }
    });
    
    // Add monthly averages
    // Always use 12 months for consistency with dashboard calculation
    const MONTHS_IN_YEAR = 12;
    Object.keys(formatAggregation).forEach(formatKey => {
      const actualMonthCount = monthsPerFormat[formatKey]?.size || 12;
      formatAggregation[formatKey].avgMonthlyRequests = Math.round(
        formatAggregation[formatKey].totalRequests / MONTHS_IN_YEAR
      );
      formatAggregation[formatKey].avgMonthlyImpressions = Math.round(
        formatAggregation[formatKey].totalImpressions / MONTHS_IN_YEAR
      );
      formatAggregation[formatKey].monthsCovered = actualMonthCount;
      
      // Convert language/property objects to arrays
      formatAggregation[formatKey].byLanguage = Object.values(formatAggregation[formatKey].byLanguage);
      formatAggregation[formatKey].byProperty = Object.values(formatAggregation[formatKey].byProperty);
    });

    res.json({
      success: true,
      formats: Object.values(formatAggregation),
      totalFormats: Object.keys(formatAggregation).length
    });
    
  } catch (error) {
    console.error('Error aggregating inventory by format:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
