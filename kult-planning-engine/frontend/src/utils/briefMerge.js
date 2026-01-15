/**
 * State merge utilities for campaign brief
 * 
 * Ensures:
 * - Existing values are not overwritten with null/undefined
 * - Arrays are merged intelligently
 * - Change tracking is maintained
 */

/**
 * Safely merge extracted entities into existing brief
 * @param {Object} currentBrief - Current brief state
 * @param {Object} extractedEntities - Newly extracted entities
 * @returns {Object} Merged brief
 */
export function mergeBrief(currentBrief, extractedEntities, requestId) {
  const merged = { ...currentBrief };
  
  // Track metadata
  merged.lastUpdatedAt = Date.now();
  merged.lastRequestId = requestId;

  // Iterate through extracted entities
  for (const [key, value] of Object.entries(extractedEntities)) {
    // Skip internal/metadata fields
    if (key.startsWith('_')) {
      continue;
    }

    // Apply merge rules
    const currentValue = currentBrief[key];
    const shouldMerge = shouldMergeField(key, currentValue, value);

    if (shouldMerge) {
      merged[key] = mergeValue(currentValue, value);
      console.log(`[BRIEF MERGE] Updated ${key}:`, { from: currentValue, to: merged[key] });
    } else {
      console.log(`[BRIEF MERGE] Kept existing ${key}:`, currentValue);
    }
  }

  return merged;
}

/**
 * Determine if a field should be merged
 */
function shouldMergeField(key, currentValue, newValue) {
  // Always merge if current is empty/null
  if (!hasValue(currentValue)) {
    return hasValue(newValue);
  }

  // Don't overwrite with empty/null
  if (!hasValue(newValue)) {
    return false;
  }

  // For arrays, merge if new array is non-empty
  if (Array.isArray(newValue)) {
    return newValue.length > 0;
  }

  // For primitives, merge if different
  if (typeof newValue !== 'object') {
    return currentValue !== newValue;
  }

  // For objects, merge
  return true;
}

/**
 * Merge a single value intelligently
 */
function mergeValue(currentValue, newValue) {
  // Arrays: replace if new is non-empty
  if (Array.isArray(newValue)) {
    return newValue.length > 0 ? newValue : currentValue;
  }

  // Objects: shallow merge
  if (typeof newValue === 'object' && newValue !== null) {
    return typeof currentValue === 'object' && currentValue !== null
      ? { ...currentValue, ...newValue }
      : newValue;
  }

  // Primitives: replace
  return newValue;
}

/**
 * Check if a value is "empty" (null, undefined, empty string, empty array, empty object)
 */
function hasValue(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return false;
  }
  return true;
}

/**
 * Validate brief structure (ensure no corruption)
 */
export function validateBrief(brief) {
  if (!brief || typeof brief !== 'object') {
    console.error('[BRIEF MERGE] Invalid brief structure');
    return false;
  }

  // Check for required structure
  const requiredType = {
    geography: 'array',
    devices: 'array',
  };

  for (const [field, type] of Object.entries(requiredType)) {
    if (brief[field] !== undefined && typeof brief[field] !== 'object') {
      console.error(`[BRIEF MERGE] Field ${field} should be ${type} but is ${typeof brief[field]}`);
      return false;
    }
    if (type === 'array' && brief[field] !== undefined && !Array.isArray(brief[field])) {
      console.error(`[BRIEF MERGE] Field ${field} should be array but is not`);
      return false;
    }
  }

  return true;
}

/**
 * Deep clone brief to avoid mutations
 */
export function cloneBrief(brief) {
  try {
    return JSON.parse(JSON.stringify(brief));
  } catch (e) {
    console.error('[BRIEF MERGE] Clone failed:', e);
    return { ...brief };
  }
}

/**
 * Test helper
 */
export function testBriefMerge() {
  const tests = [
    {
      name: 'Add new field',
      current: { budget_rm: 1000 },
      extracted: { industry: 'Tech' },
      expected: { budget_rm: 1000, industry: 'Tech' }
    },
    {
      name: 'Dont overwrite with null',
      current: { budget_rm: 1000 },
      extracted: { budget_rm: null },
      expected: { budget_rm: 1000 }
    },
    {
      name: 'Update with new value',
      current: { budget_rm: 1000 },
      extracted: { budget_rm: 2000 },
      expected: { budget_rm: 2000 }
    },
    {
      name: 'Merge arrays',
      current: { geography: ['KL'] },
      extracted: { geography: ['Selangor'] },
      expected: { geography: ['Selangor'] }
    },
    {
      name: 'Keep array if new is empty',
      current: { geography: ['KL'] },
      extracted: { geography: [] },
      expected: { geography: ['KL'] }
    }
  ];

  const results = tests.map(test => {
    const result = mergeBrief(test.current, test.extracted, 'test-req');
    const passed = JSON.stringify(result.budget_rm) === JSON.stringify(test.expected.budget_rm) &&
                   JSON.stringify(result.industry) === JSON.stringify(test.expected.industry) &&
                   JSON.stringify(result.geography) === JSON.stringify(test.expected.geography);
    return { name: test.name, passed, result };
  });

  console.log('[BRIEF MERGE TEST]', results);
  return results;
}
