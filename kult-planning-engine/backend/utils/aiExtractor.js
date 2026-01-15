/**
 * AI-Powered Entity Extraction
 * Uses OpenAI GPT to extract campaign brief fields from unstructured text
 */

import OpenAI from 'openai';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

// Load OpenAI configuration from ~/.genspark_llm.yaml or environment
const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
let config = null;

if (fs.existsSync(configPath)) {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContents);
  } catch (err) {
    console.warn('[AI EXTRACTOR] Could not load config file:', err.message);
  }
}

// Get API credentials
const apiKey = process.env.OPENAI_API_KEY || config?.openai?.api_key || 'dummy-key-for-dev';

// Use official OpenAI API (not GenSpark proxy)
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Initialize OpenAI client
let openai = null;
try {
  if (apiKey && apiKey !== 'dummy-key-for-dev') {
    openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });
    console.log('[AI EXTRACTOR] OpenAI client initialized');
    console.log('[AI EXTRACTOR] Using API:', baseURL);
    console.log('[AI EXTRACTOR] API Key:', apiKey.substring(0, 15) + '...');
  } else {
    console.warn('[AI EXTRACTOR] No valid API key found - AI extraction disabled');
  }
} catch (err) {
  console.error('[AI EXTRACTOR] Failed to initialize OpenAI client:', err.message);
}

/**
 * Extract campaign brief entities using AI
 * @param {string} documentText - Full document text
 * @param {Object} patternExtracted - Already extracted fields from pattern matching
 * @returns {Promise<Object>} Extracted brief with confidence scores
 */
export async function extractWithAI(documentText, patternExtracted = {}) {
  console.log('[AI EXTRACTION] Starting extraction...');
  console.log('[AI EXTRACTION] Document length:', documentText.length, 'chars');
  console.log('[AI EXTRACTION] Pattern-extracted fields:', Object.keys(patternExtracted));
  
  // Check if OpenAI client is initialized
  if (!openai) {
    console.warn('[AI EXTRACTION] OpenAI client not initialized - falling back to pattern matching only');
    return {
      ...patternExtracted,
      _extractionMethod: 'pattern-only',
      _error: 'AI extraction unavailable - OpenAI client not initialized'
    };
  }
  
  // Truncate very long documents to avoid token limits
  const maxLength = 8000; // ~2000 tokens
  const truncatedText = documentText.length > maxLength 
    ? documentText.substring(0, maxLength) + '\n\n[... document truncated ...]'
    : documentText;
  
  const systemPrompt = `You are an expert campaign brief analyzer. Extract structured campaign information from marketing briefs and proposals.

Your task is to extract the following fields:
- campaignName: The name/title of the campaign
- client: Client or brand name
- product_brand: Specific product or service being promoted
- campaign_objective: Must be one of: "Awareness", "Traffic", "Engagement", "Conversion"
- industry: Industry/vertical (e.g., Automotive, Beauty, FMCG, Banking, Retail)
- budget_rm: Total budget in Malaysian Ringgit (convert to number)
- geography: Locations/regions targeted (as string or array)
- duration_weeks: Campaign duration in weeks (convert to number)
- targetAudience: Description of target audience
- devices: Target devices (Mobile, Desktop, CTV, etc.)
- channel_preference: Preferred channel - "OTT", "Social", "Display", or "Balanced"
- priority: Campaign priority - "Max Reach" or "Performance"

Rules:
1. Return ONLY valid JSON with the exact field names above
2. Use null for missing fields (do not guess)
3. Convert all budget values to numbers (e.g., "RM 250K" → 250000)
4. Convert duration to weeks (e.g., "2 months" → 8)
5. For campaign_objective, choose the closest match from: Awareness, Traffic, Engagement, Conversion
6. Add a "confidence" object with scores 0.0-1.0 for each field:
   - 1.0 = explicitly stated in document
   - 0.7 = strongly implied
   - 0.5 = inferred from context
   - 0.3 = weak inference
   - 0.0 = complete guess (use null instead)
7. If a field was already extracted accurately by pattern matching, keep that value`;

  const userPrompt = `Extract campaign brief information from this document:

${truncatedText}

${Object.keys(patternExtracted).length > 0 ? `\nNote: These fields were already extracted by pattern matching - verify and use if accurate:\n${JSON.stringify(patternExtracted, null, 2)}` : ''}

Return JSON with the campaign brief fields and confidence scores.`;

  try {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use GPT-4o-mini for cost-effectiveness and reliability
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' } // Force JSON response
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[AI EXTRACTION] Completed in ${elapsed}ms`);
    console.log('[AI EXTRACTION] Tokens used:', response.usage?.total_tokens || 'N/A');
    
    const extractedData = JSON.parse(response.choices[0].message.content);
    console.log('[AI EXTRACTION] Extracted fields:', Object.keys(extractedData).filter(k => k !== 'confidence'));
    
    // Merge pattern-extracted fields (they take priority)
    const mergedData = {
      ...extractedData,
      ...patternExtracted, // Pattern results override AI for structured fields
      _extractionMethod: 'ai-hybrid',
      _aiModel: 'gpt-5-mini',
      _extractionTime: elapsed
    };
    
    return mergedData;
    
  } catch (error) {
    console.error('[AI EXTRACTION ERROR]:', error.message);
    
    // Fallback to pattern-extracted fields if AI fails
    return {
      ...patternExtracted,
      _extractionMethod: 'pattern-only',
      _error: error.message
    };
  }
}

/**
 * Validate and clean extracted brief data
 * @param {Object} extractedBrief - Raw extracted brief
 * @returns {Object} Validated and cleaned brief
 */
export function validateExtraction(extractedBrief) {
  const validated = { ...extractedBrief };
  
  // Ensure campaign_objective is valid
  const validObjectives = ['Awareness', 'Traffic', 'Engagement', 'Conversion'];
  if (validated.campaign_objective && !validObjectives.includes(validated.campaign_objective)) {
    console.warn('[VALIDATION] Invalid objective:', validated.campaign_objective);
    validated.campaign_objective = null;
  }
  
  // Ensure budget is a number
  if (validated.budget_rm && typeof validated.budget_rm === 'string') {
    const parsed = parseFloat(validated.budget_rm.replace(/[^0-9.]/g, ''));
    validated.budget_rm = isNaN(parsed) ? null : parsed;
  }
  
  // Ensure duration is a number
  if (validated.duration_weeks && typeof validated.duration_weeks === 'string') {
    const parsed = parseInt(validated.duration_weeks);
    validated.duration_weeks = isNaN(parsed) ? null : parsed;
  }
  
  // Ensure channel_preference is valid
  const validChannels = ['OTT', 'Social', 'Display', 'Balanced'];
  if (validated.channel_preference && !validChannels.includes(validated.channel_preference)) {
    console.warn('[VALIDATION] Invalid channel:', validated.channel_preference);
    validated.channel_preference = null;
  }
  
  // Ensure priority is valid
  const validPriorities = ['Max Reach', 'Performance'];
  if (validated.priority && !validPriorities.includes(validated.priority)) {
    console.warn('[VALIDATION] Invalid priority:', validated.priority);
    validated.priority = null;
  }
  
  // Clean up geography (ensure it's a string)
  if (Array.isArray(validated.geography)) {
    validated.geography = validated.geography.join(', ');
  }
  
  // Clean up devices (ensure it's a string or array)
  if (typeof validated.devices === 'string') {
    // Keep as string
  } else if (Array.isArray(validated.devices)) {
    validated.devices = validated.devices.join(', ');
  }
  
  console.log('[VALIDATION] Brief validated successfully');
  
  return validated;
}

/**
 * Process document: parse + pattern extraction + AI extraction
 * Complete pipeline for file upload
 * @param {string} documentText - Full document text from parser
 * @returns {Promise<Object>} Complete extracted brief with metadata
 */
export async function processDocument(documentText) {
  console.log('[DOCUMENT PROCESSOR] Starting full extraction pipeline...');
  
  // Step 1: Pattern matching (fast, cheap, reliable for structured data)
  const { extractWithPatterns } = await import('./fileParser.js');
  const patternExtracted = extractWithPatterns(documentText);
  console.log('[DOCUMENT PROCESSOR] Pattern extraction complete:', Object.keys(patternExtracted).length, 'fields');
  
  // Step 2: AI extraction (smart, handles unstructured data)
  const aiExtracted = await extractWithAI(documentText, patternExtracted);
  console.log('[DOCUMENT PROCESSOR] AI extraction complete');
  
  // Step 3: Validation and cleanup
  const validatedBrief = validateExtraction(aiExtracted);
  console.log('[DOCUMENT PROCESSOR] Validation complete');
  
  // Step 4: Calculate overall confidence
  const confidenceScores = validatedBrief.confidence || {};
  const avgConfidence = Object.values(confidenceScores).length > 0
    ? Object.values(confidenceScores).reduce((a, b) => a + b, 0) / Object.values(confidenceScores).length
    : 0.5;
  
  validatedBrief._overallConfidence = avgConfidence;
  validatedBrief._needsReview = avgConfidence < 0.7; // Flag for user review if confidence is low
  
  console.log('[DOCUMENT PROCESSOR] Overall confidence:', avgConfidence.toFixed(2));
  console.log('[DOCUMENT PROCESSOR] Needs review:', validatedBrief._needsReview);
  
  return validatedBrief;
}
