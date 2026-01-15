/**
 * File Parser Utilities
 * Extracts text from PDF, DOCX, and TXT files
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import mammoth from 'mammoth';

/**
 * Parse PDF file to extract text
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
export async function parsePDF(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer);
    console.log('[PDF PARSE] Pages:', data.numpages);
    console.log('[PDF PARSE] Text length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('[PDF PARSE ERROR]:', error.message);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse DOCX file to extract text
 * @param {Buffer} fileBuffer - DOCX file buffer
 * @returns {Promise<string>} Extracted text
 */
export async function parseDOCX(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    console.log('[DOCX PARSE] Text length:', result.value.length);
    console.log('[DOCX PARSE] Messages:', result.messages);
    return result.value;
  } catch (error) {
    console.error('[DOCX PARSE ERROR]:', error.message);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Parse TXT file to extract text
 * @param {Buffer} fileBuffer - TXT file buffer
 * @returns {Promise<string>} Extracted text
 */
export async function parseTXT(fileBuffer) {
  try {
    const text = fileBuffer.toString('utf-8');
    console.log('[TXT PARSE] Text length:', text.length);
    return text;
  } catch (error) {
    console.error('[TXT PARSE ERROR]:', error.message);
    throw new Error(`Failed to parse TXT: ${error.message}`);
  }
}

/**
 * Parse file based on MIME type
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text
 */
export async function parseFile(fileBuffer, mimeType) {
  console.log('[FILE PARSER] MIME type:', mimeType);
  
  if (mimeType === 'application/pdf') {
    return await parsePDF(fileBuffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await parseDOCX(fileBuffer);
  } else if (mimeType === 'text/plain') {
    return await parseTXT(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Extract structured data using pattern matching (fast, cheap)
 * @param {string} text - Document text
 * @returns {Object} Extracted fields
 */
export function extractWithPatterns(text) {
  const extracted = {};
  
  // Budget extraction - handles various formats
  const budgetPatterns = [
    /(?:budget|total\s*budget|campaign\s*budget)[:\s]*RM\s*([\d,]+\.?\d*)\s*([KkMm])?/i,
    /(?:budget|total\s*budget|campaign\s*budget)[:\s]*\$\s*([\d,]+\.?\d*)\s*([KkMm])?/i,
    /RM\s*([\d,]+\.?\d*)\s*([KkMm])?\s*(?:budget|spend|allocation)/i
  ];
  
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2]?.toUpperCase();
      if (multiplier === 'K') amount *= 1000;
      if (multiplier === 'M') amount *= 1000000;
      extracted.budget_rm = amount;
      console.log('[PATTERN] Budget extracted:', amount);
      break;
    }
  }
  
  // Duration extraction
  const durationPatterns = [
    /(?:duration|period|campaign\s*length)[:\s]*(\d+)\s*(week|month|day)/i,
    /(?:for|over|spanning)\s*(\d+)\s*(week|month|day)/i
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      let weeks = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'month') weeks *= 4;
      if (unit === 'day') weeks = Math.ceil(weeks / 7);
      extracted.duration_weeks = weeks;
      console.log('[PATTERN] Duration extracted:', weeks, 'weeks');
      break;
    }
  }
  
  // Geography extraction - Malaysian states and regions
  const geoKeywords = [
    'Nationwide', 'Malaysia', 'Peninsular', 
    'Penang', 'Kedah', 'Perlis', 'Perak', 
    'Johor', 'Melaka', 'Negeri Sembilan',
    'Kelantan', 'Terengganu', 'Pahang',
    'Selangor', 'Kuala Lumpur', 'KL', 'Putrajaya',
    'Sabah', 'Sarawak', 'Labuan',
    'Northern', 'Southern', 'East Coast', 'East Malaysia',
    'Klang Valley'
  ];
  
  const foundGeos = geoKeywords.filter(geo => 
    new RegExp(`\\b${geo}\\b`, 'i').test(text)
  );
  
  if (foundGeos.length > 0) {
    extracted.geography = foundGeos.join(', ');
    console.log('[PATTERN] Geography extracted:', foundGeos.length, 'locations');
  }
  
  // Objective extraction - keyword matching
  const objectiveMap = {
    'Awareness': ['awareness', 'brand\s*awareness', 'reach', 'visibility', 'top\s*of\s*mind'],
    'Traffic': ['traffic', 'visits', 'clicks', 'website\s*traffic', 'drive\s*traffic'],
    'Engagement': ['engagement', 'interaction', 'social\s*engagement', 'community', 'likes', 'shares'],
    'Conversion': ['conversion', 'sales', 'leads', 'purchase', 'sign\s*up', 'registration', 'ctr']
  };
  
  for (const [objective, keywords] of Object.entries(objectiveMap)) {
    for (const kw of keywords) {
      if (new RegExp(kw, 'i').test(text)) {
        extracted.campaign_objective = objective;
        console.log('[PATTERN] Objective extracted:', objective);
        break;
      }
    }
    if (extracted.campaign_objective) break;
  }
  
  // Channel preference extraction
  const channelMap = {
    'OTT': ['ott', 'over\s*the\s*top', 'streaming', 'video\s*platform', 'ctv', 'connected\s*tv'],
    'Social': ['social\s*media', 'facebook', 'instagram', 'tiktok', 'twitter', 'social\s*platform'],
    'Display': ['display', 'banner', 'programmatic', 'digital\s*display']
  };
  
  for (const [channel, keywords] of Object.entries(channelMap)) {
    for (const kw of keywords) {
      if (new RegExp(kw, 'i').test(text)) {
        extracted.channel_preference = channel;
        console.log('[PATTERN] Channel preference extracted:', channel);
        break;
      }
    }
    if (extracted.channel_preference) break;
  }
  
  return extracted;
}
