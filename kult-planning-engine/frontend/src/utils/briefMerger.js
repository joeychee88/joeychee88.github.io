/**
 * Smart brief state merger for AI Wizard
 * Implements safe merging rules to prevent data loss
 */

/**
 * Merge extracted entities into existing brief with smart rules
 * Rules:
 * - Never overwrite filled field with null/undefined/empty
 * - Arrays: replace only if extracted array is non-empty
 * - Objects: shallow merge, keeping existing values if new is null/undefined
 * - Track lastUpdatedAt and lastRequestId
 * 
 * @param {Object} existingBrief - Current brief state
 * @param {Object} extractedEntities - New entities from AI
 * @param {string} requestId - Request ID for tracking
 * @returns {Object} Merged brief
 */
export function mergeBriefSafely(existingBrief, extractedEntities, requestId) {
  if (!extractedEntities || typeof extractedEntities !== 'object') {
    console.warn('[MERGE] Invalid extractedEntities, keeping existing brief');
    return existingBrief;
  }

  const merged = { ...existingBrief };
  let changeCount = 0;
  const changes = [];

  for (const [key, newValue] of Object.entries(extractedEntities)) {
    // Skip internal fields that start with _
    if (key.startsWith('_')) continue;

    const oldValue = merged[key];
    const shouldUpdate = shouldUpdateField(key, oldValue, newValue);

    if (shouldUpdate) {
      merged[key] = newValue;
      changeCount++;
      changes.push({
        field: key,
        from: oldValue,
        to: newValue
      });
    }
  }

  // Update tracking fields
  if (changeCount > 0) {
    merged.lastUpdatedAt = new Date().toISOString();
    merged.lastRequestId = requestId;
    
    console.log(`[MERGE] Updated ${changeCount} fields:`, 
      changes.map(c => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join(', ')
    );
  } else {
    console.log('[MERGE] No fields updated (all unchanged or invalid)');
  }

  return merged;
}

/**
 * Determine if a field should be updated based on merge rules
 */
function shouldUpdateField(key, oldValue, newValue) {
  // Rule 1: Never overwrite with null or undefined
  if (newValue === null || newValue === undefined) {
    return false;
  }

  // Rule 2: Don't overwrite filled string with empty string
  if (typeof newValue === 'string') {
    if (newValue.trim() === '') {
      return false;
    }
    // Update if old is empty or new is different
    return !oldValue || oldValue !== newValue;
  }

  // Rule 3: Arrays - only update if new array is non-empty
  if (Array.isArray(newValue)) {
    if (newValue.length === 0) {
      return false;
    }
    // Update if old is empty or arrays are different
    return !oldValue || !Array.isArray(oldValue) || 
           JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  // Rule 4: Objects - only update if new object is non-empty
  if (typeof newValue === 'object' && !Array.isArray(newValue)) {
    if (Object.keys(newValue).length === 0) {
      return false;
    }
    return true; // Allow object updates
  }

  // Rule 5: Numbers - only update if new is positive
  if (typeof newValue === 'number') {
    if (newValue <= 0) {
      return false;
    }
    return !oldValue || oldValue !== newValue;
  }

  // Rule 6: Booleans - always update (explicit user choice)
  if (typeof newValue === 'boolean') {
    return oldValue !== newValue;
  }

  // Default: update if different
  return oldValue !== newValue;
}

/**
 * Create a diff between two brief states
 * Useful for debugging and logging
 */
export function createBriefDiff(oldBrief, newBrief) {
  const diff = {
    added: [],
    changed: [],
    removed: [],
    unchanged: []
  };

  const allKeys = new Set([
    ...Object.keys(oldBrief || {}),
    ...Object.keys(newBrief || {})
  ]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith('_')) continue;

    const oldVal = oldBrief?.[key];
    const newVal = newBrief?.[key];

    if (oldVal === undefined && newVal !== undefined) {
      diff.added.push({ field: key, value: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      diff.removed.push({ field: key, value: oldVal });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff.changed.push({ field: key, from: oldVal, to: newVal });
    } else {
      diff.unchanged.push(key);
    }
  }

  return diff;
}

/**
 * Validate brief state for consistency
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBriefState(brief) {
  const errors = [];

  // Check for negative numbers
  if (brief.budget_rm !== null && brief.budget_rm !== undefined) {
    if (typeof brief.budget_rm !== 'number' || brief.budget_rm < 0) {
      errors.push('budget_rm must be a positive number');
    }
  }

  if (brief.duration_weeks !== null && brief.duration_weeks !== undefined) {
    if (typeof brief.duration_weeks !== 'number' || brief.duration_weeks < 1) {
      errors.push('duration_weeks must be at least 1');
    }
  }

  // Check array fields are actually arrays
  const arrayFields = ['geography', 'devices', 'audience'];
  for (const field of arrayFields) {
    if (brief[field] !== null && brief[field] !== undefined && !Array.isArray(brief[field])) {
      errors.push(`${field} must be an array, got ${typeof brief[field]}`);
    }
  }

  // Check string fields are strings
  const stringFields = ['product_brand', 'campaign_objective', 'industry'];
  for (const field of stringFields) {
    if (brief[field] !== null && brief[field] !== undefined && typeof brief[field] !== 'string') {
      errors.push(`${field} must be a string, got ${typeof brief[field]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test suite for brief merging
 */
export function runBriefMergeTests() {
  console.log('=== Running Brief Merge Tests ===');

  const tests = [
    {
      name: 'Merge new field into empty brief',
      existing: {},
      extracted: { product_brand: 'New Brand' },
      expect: { product_brand: 'New Brand' }
    },
    {
      name: 'Do not overwrite filled field with null',
      existing: { budget_rm: 50000 },
      extracted: { budget_rm: null },
      expect: { budget_rm: 50000 }
    },
    {
      name: 'Do not overwrite filled field with empty string',
      existing: { product_brand: 'Existing Brand' },
      extracted: { product_brand: '' },
      expect: { product_brand: 'Existing Brand' }
    },
    {
      name: 'Update field with new non-empty value',
      existing: { product_brand: 'Old Brand' },
      extracted: { product_brand: 'New Brand' },
      expect: { product_brand: 'New Brand' }
    },
    {
      name: 'Do not overwrite filled array with empty array',
      existing: { geography: ['Kuala Lumpur'] },
      extracted: { geography: [] },
      expect: { geography: ['Kuala Lumpur'] }
    },
    {
      name: 'Update array with non-empty array',
      existing: { geography: ['Kuala Lumpur'] },
      extracted: { geography: ['Selangor', 'Penang'] },
      expect: { geography: ['Selangor', 'Penang'] }
    },
    {
      name: 'Multiple field update',
      existing: { 
        product_brand: 'Brand A',
        budget_rm: null
      },
      extracted: { 
        product_brand: 'Brand B',
        budget_rm: 75000,
        industry: 'Retail'
      },
      expect: { 
        product_brand: 'Brand B',
        budget_rm: 75000,
        industry: 'Retail'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = mergeBriefSafely(test.existing, test.extracted, 'test_req_001');
      
      // Check if all expected fields match
      let matches = true;
      for (const [key, expectedVal] of Object.entries(test.expect)) {
        if (JSON.stringify(result[key]) !== JSON.stringify(expectedVal)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log('  Expected:', test.expect);
        console.log('  Got:', result);
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
