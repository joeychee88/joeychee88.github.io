/**
 * Normalize model responses to ensure consistent shape
 * Handles JSON strings, malformed JSON, and various response formats
 */

/**
 * Normalize a raw model response into a consistent shape
 * @param {any} raw - Raw response from backend/model
 * @returns {Object} { assistantText: string, extractedEntities: object, metadata: object }
 */
export function normalizeModelResponse(raw) {
  console.log('[NORMALIZE] Input type:', typeof raw, 'starts with {:', 
    typeof raw === 'string' && raw.trim().startsWith('{'));

  // Case 1: Already a well-formed object
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const assistantText = raw.response || raw.message || raw.assistantText || '';
    const extractedEntities = raw.extractedEntities || {};
    const metadata = raw.metadata || {};
    
    console.log('[NORMALIZE] Already object, extracted text length:', assistantText.length);
    return {
      assistantText: String(assistantText),
      extractedEntities,
      metadata
    };
  }

  // Case 2: String that might be JSON
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    
    // Try to parse as JSON if it looks like JSON
    if (trimmed.startsWith('{') || trimmed.includes('"extractedEntities"') || trimmed.includes('"response"')) {
      try {
        const parsed = JSON.parse(trimmed);
        console.log('[NORMALIZE] Parsed JSON string successfully');
        
        // Recursively normalize the parsed object
        return normalizeModelResponse(parsed);
      } catch (parseError) {
        console.warn('[NORMALIZE] JSON parse failed, extracting text:', parseError.message);
        
        // Try to extract "response" field with regex
        const responseMatch = trimmed.match(/"response"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (responseMatch) {
          const extracted = responseMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          
          console.log('[NORMALIZE] Extracted via regex, length:', extracted.length);
          return {
            assistantText: extracted,
            extractedEntities: {},
            metadata: { parseMethod: 'regex' }
          };
        }
        
        // Last resort: strip JSON artifacts manually
        const cleaned = stripJsonArtifacts(trimmed);
        console.log('[NORMALIZE] Cleaned artifacts, length:', cleaned.length);
        return {
          assistantText: cleaned,
          extractedEntities: {},
          metadata: { parseMethod: 'strip' }
        };
      }
    }
    
    // Plain text string
    console.log('[NORMALIZE] Plain text, length:', trimmed.length);
    return {
      assistantText: trimmed,
      extractedEntities: {},
      metadata: {}
    };
  }

  // Case 3: Unexpected type (null, undefined, array, etc.)
  console.warn('[NORMALIZE] Unexpected type:', typeof raw);
  return {
    assistantText: String(raw || ''),
    extractedEntities: {},
    metadata: { warning: 'unexpected_type' }
  };
}

/**
 * Strip JSON artifacts from text to make it user-readable
 */
function stripJsonArtifacts(text) {
  return text
    // Remove JSON object patterns
    .replace(/\{[^}]*"response"\s*:\s*"/gi, '')
    .replace(/",?\s*"extractedEntities"[^}]*\}/gi, '')
    .replace(/\{[^}]*\}/g, '')
    // Remove stray quotes and braces
    .replace(/^["'\{]+|["'\}]+$/g, '')
    // Unescape common patterns
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    // Clean up whitespace
    .trim();
}

/**
 * Validate that assistantText doesn't contain JSON artifacts
 * Returns true if clean, false if it looks like JSON leaked
 */
export function validateCleanText(text) {
  if (!text || typeof text !== 'string') return true;
  
  const hasJsonMarkers = 
    text.includes('extractedEntities') ||
    text.includes('"response":') ||
    (text.trim().startsWith('{') && text.trim().endsWith('}')) ||
    text.includes('[object Object]');
  
  if (hasJsonMarkers) {
    console.error('[VALIDATE] JSON artifacts detected in assistantText:', text.substring(0, 100));
    return false;
  }
  
  return true;
}

/**
 * Test suite for normalizeModelResponse
 */
export function runNormalizationTests() {
  console.log('=== Running Normalization Tests ===');
  
  const tests = [
    {
      name: 'Well-formed object',
      input: { response: 'Hello world', extractedEntities: { budget: 5000 } },
      expect: { assistantText: 'Hello world', entities: { budget: 5000 } }
    },
    {
      name: 'JSON string',
      input: '{"response": "Test message", "extractedEntities": {"industry": "Retail"}}',
      expect: { assistantText: 'Test message', entities: { industry: 'Retail' } }
    },
    {
      name: 'Malformed JSON',
      input: '{"response": "Broken JSON", "extractedEntities": {incomplete',
      expect: { assistantText: 'Broken JSON', entities: {} }
    },
    {
      name: 'Plain text',
      input: 'Just a plain text message',
      expect: { assistantText: 'Just a plain text message', entities: {} }
    },
    {
      name: 'JSON with escaped newlines',
      input: '{"response": "Line 1\\nLine 2\\nLine 3", "extractedEntities": {}}',
      expect: { assistantText: 'Line 1\nLine 2\nLine 3', entities: {} }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    try {
      const result = normalizeModelResponse(test.input);
      const textMatch = result.assistantText === test.expect.assistantText;
      const entitiesMatch = JSON.stringify(result.extractedEntities) === JSON.stringify(test.expect.entities);
      
      if (textMatch && entitiesMatch) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log('  Expected:', test.expect);
        console.log('  Got:', { assistantText: result.assistantText, entities: result.extractedEntities });
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Exception:`, error.message);
      failed++;
    }
  });
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}
