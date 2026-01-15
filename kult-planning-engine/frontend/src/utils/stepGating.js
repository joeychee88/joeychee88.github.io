/**
 * Step gating and validation for AI Wizard
 * Ensures required fields are present before advancing steps or generating plans
 */

/**
 * Required fields for each step
 * Adjust these to match your actual wizard flow
 */
export const STEP_REQUIRED_FIELDS = {
  1: ['product_brand', 'campaign_objective'],
  2: ['industry', 'geography'],
  3: ['budget_rm'],
  4: ['duration_weeks'],
  5: [] // Final step - plan generation will have its own checks
};

/**
 * Required fields for plan generation (must have ALL of these)
 */
export const PLAN_GENERATION_REQUIRED_FIELDS = [
  'product_brand',
  'campaign_objective',
  'industry',
  'geography',
  'budget_rm'
];

/**
 * Check if a value is considered "filled"
 */
function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * Get missing fields for a given step
 * @param {number} step - Current step number
 * @param {Object} brief - Campaign brief object
 * @returns {string[]} Array of missing field names
 */
export function missingFields(step, brief) {
  const required = STEP_REQUIRED_FIELDS[step] || [];
  const missing = [];
  
  for (const field of required) {
    if (!isFilled(brief[field])) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Check if wizard can advance from current step
 * @param {number} step - Current step number
 * @param {Object} brief - Campaign brief object
 * @returns {boolean} True if can advance
 */
export function canAdvance(step, brief) {
  const missing = missingFields(step, brief);
  const canAdvance = missing.length === 0;
  
  if (!canAdvance) {
    console.log(`[STEP_GATE] Cannot advance from step ${step}, missing:`, missing);
  }
  
  return canAdvance;
}

/**
 * Check if we have minimum required fields for plan generation
 * @param {Object} brief - Campaign brief object
 * @returns {boolean} True if can generate plan
 */
export function canGeneratePlan(brief) {
  const missing = [];
  
  for (const field of PLAN_GENERATION_REQUIRED_FIELDS) {
    if (!isFilled(brief[field])) {
      missing.push(field);
    }
  }
  
  const canGenerate = missing.length === 0;
  
  if (!canGenerate) {
    console.log('[STEP_GATE] Cannot generate plan, missing required fields:', missing);
  } else {
    console.log('[STEP_GATE] ✅ All required fields present for plan generation');
  }
  
  return canGenerate;
}

/**
 * Get missing fields for plan generation
 * @param {Object} brief - Campaign brief object
 * @returns {string[]} Array of missing field names
 */
export function missingPlanFields(brief) {
  const missing = [];
  
  for (const field of PLAN_GENERATION_REQUIRED_FIELDS) {
    if (!isFilled(brief[field])) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Calculate brief completeness percentage
 * @param {Object} brief - Campaign brief object
 * @returns {number} Percentage (0-100)
 */
export function calculateCompleteness(brief) {
  const total = PLAN_GENERATION_REQUIRED_FIELDS.length;
  const filled = PLAN_GENERATION_REQUIRED_FIELDS.filter(field => isFilled(brief[field])).length;
  return Math.round((filled / total) * 100);
}

/**
 * Get human-readable field names for UI display
 */
const FIELD_LABELS = {
  product_brand: 'Product/Brand',
  campaign_objective: 'Campaign Objective',
  industry: 'Industry',
  geography: 'Geography/Regions',
  budget_rm: 'Budget (RM)',
  duration_weeks: 'Campaign Duration',
  devices: 'Target Devices',
  audience: 'Target Audience'
};

/**
 * Get human-readable name for a field
 */
export function getFieldLabel(fieldName) {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * Format missing fields for display in AI prompt
 * @param {string[]} missingFieldNames - Array of field names
 * @returns {string} Formatted string for AI context
 */
export function formatMissingFieldsForPrompt(missingFieldNames) {
  if (missingFieldNames.length === 0) return '';
  
  const labels = missingFieldNames.map(f => getFieldLabel(f));
  
  if (labels.length === 1) {
    return `We still need: ${labels[0]}`;
  } else if (labels.length === 2) {
    return `We still need: ${labels[0]} and ${labels[1]}`;
  } else {
    const last = labels[labels.length - 1];
    const others = labels.slice(0, -1).join(', ');
    return `We still need: ${others}, and ${last}`;
  }
}

/**
 * Test suite for step gating
 */
export function runStepGatingTests() {
  console.log('=== Running Step Gating Tests ===');
  
  const tests = [
    {
      name: 'Empty brief - cannot generate plan',
      brief: {},
      expectCanGenerate: false,
      expectMissing: PLAN_GENERATION_REQUIRED_FIELDS
    },
    {
      name: 'Partial brief - cannot generate plan',
      brief: {
        product_brand: 'Test Brand',
        campaign_objective: 'Awareness',
        industry: 'Retail'
      },
      expectCanGenerate: false,
      expectMissing: ['geography', 'budget_rm']
    },
    {
      name: 'Complete brief - can generate plan',
      brief: {
        product_brand: 'Test Brand',
        campaign_objective: 'Awareness',
        industry: 'Retail',
        geography: ['Kuala Lumpur'],
        budget_rm: 50000
      },
      expectCanGenerate: true,
      expectMissing: []
    },
    {
      name: 'Brief with null budget - cannot generate',
      brief: {
        product_brand: 'Test Brand',
        campaign_objective: 'Awareness',
        industry: 'Retail',
        geography: ['Kuala Lumpur'],
        budget_rm: null
      },
      expectCanGenerate: false,
      expectMissing: ['budget_rm']
    },
    {
      name: 'Brief with empty geography array - cannot generate',
      brief: {
        product_brand: 'Test Brand',
        campaign_objective: 'Awareness',
        industry: 'Retail',
        geography: [],
        budget_rm: 50000
      },
      expectCanGenerate: false,
      expectMissing: ['geography']
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    try {
      const canGen = canGeneratePlan(test.brief);
      const missing = missingPlanFields(test.brief);
      
      const canGenMatch = canGen === test.expectCanGenerate;
      const missingMatch = JSON.stringify(missing.sort()) === JSON.stringify(test.expectMissing.sort());
      
      if (canGenMatch && missingMatch) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log('  Expected:', { canGenerate: test.expectCanGenerate, missing: test.expectMissing });
        console.log('  Got:', { canGenerate: canGen, missing });
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
