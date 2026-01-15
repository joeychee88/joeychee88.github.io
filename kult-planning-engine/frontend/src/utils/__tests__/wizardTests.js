/**
 * Comprehensive test suite for AI Wizard production fixes
 * Run with: import and call runAllWizardTests() in browser console
 */

import { runNormalizationTests } from './responseNormalizer.js';
import { runStepGatingTests } from './stepGating.js';
import { runBriefMergeTests } from './briefMerger.js';

/**
 * Test duplicate request prevention
 */
function testDuplicateRequestPrevention() {
  console.log('=== Testing Duplicate Request Prevention ===');
  
  const { WizardRequestManager } = require('./wizardRequestManager.js');
  const manager = new WizardRequestManager();
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: First request should succeed
  try {
    const canSend1 = manager.canSendRequest();
    if (canSend1) {
      console.log('✅ First request allowed');
      passed++;
    } else {
      console.log('❌ First request blocked incorrectly');
      failed++;
    }
  } catch (e) {
    console.log('❌ First request test failed:', e.message);
    failed++;
  }
  
  // Test 2: Start request and check in-flight blocking
  try {
    const { requestId } = manager.startRequest();
    const canSend2 = manager.canSendRequest();
    
    if (!canSend2) {
      console.log('✅ Second request blocked while first in-flight');
      passed++;
    } else {
      console.log('❌ Second request not blocked');
      failed++;
    }
  } catch (e) {
    console.log('❌ In-flight blocking test failed:', e.message);
    failed++;
  }
  
  // Test 3: Complete request and allow new requests
  try {
    const { requestId } = manager.startRequest();
    manager.completeRequest(requestId);
    const canSend3 = manager.canSendRequest();
    
    if (canSend3) {
      console.log('✅ New request allowed after completion');
      passed++;
    } else {
      console.log('❌ New request blocked after completion');
      failed++;
    }
  } catch (e) {
    console.log('❌ Completion test failed:', e.message);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

/**
 * Test out-of-order response handling
 */
function testOutOfOrderResponses() {
  console.log('=== Testing Out-of-Order Response Handling ===');
  
  const { WizardRequestManager } = require('./wizardRequestManager.js');
  const manager = new WizardRequestManager();
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Start multiple requests (simulating rapid sends)
  try {
    const req1 = manager.startRequest();
    const req2 = manager.startRequest(); // Aborts req1
    const req3 = manager.startRequest(); // Aborts req2
    
    // Only req3 should be applied
    const shouldApply1 = manager.shouldApplyResponse(req1.requestId);
    const shouldApply2 = manager.shouldApplyResponse(req2.requestId);
    const shouldApply3 = manager.shouldApplyResponse(req3.requestId);
    
    if (!shouldApply1 && !shouldApply2 && shouldApply3) {
      console.log('✅ Only latest request response should be applied');
      passed++;
    } else {
      console.log('❌ Incorrect response application logic');
      console.log('  req1 should apply:', shouldApply1, '(expect false)');
      console.log('  req2 should apply:', shouldApply2, '(expect false)');
      console.log('  req3 should apply:', shouldApply3, '(expect true)');
      failed++;
    }
  } catch (e) {
    console.log('❌ Out-of-order test failed:', e.message);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

/**
 * Test malformed JSON handling
 */
function testMalformedJsonHandling() {
  console.log('=== Testing Malformed JSON Handling ===');
  
  const { normalizeModelResponse, validateCleanText } = require('./responseNormalizer.js');
  
  let passed = 0;
  let failed = 0;
  
  const malformedInputs = [
    '{"response": "Test", "extractedEntities": {incomplete}',
    '{"response": "Test"',
    'Not JSON at all',
    '{"response": "Has \\"quotes\\" and \\nnewlines"}',
    '',
    null,
    undefined,
    123,
    []
  ];
  
  malformedInputs.forEach((input, index) => {
    try {
      const result = normalizeModelResponse(input);
      
      // Should not crash
      if (result && typeof result === 'object' && 'assistantText' in result) {
        // Should have clean text (no JSON artifacts)
        const isClean = validateCleanText(result.assistantText);
        
        if (isClean) {
          console.log(`✅ Malformed input ${index + 1} handled cleanly`);
          passed++;
        } else {
          console.log(`❌ Malformed input ${index + 1} leaked JSON to text`);
          failed++;
        }
      } else {
        console.log(`❌ Malformed input ${index + 1} returned invalid shape`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ Malformed input ${index + 1} threw exception:`, e.message);
      failed++;
    }
  });
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

/**
 * Test plan generation gating with missing fields
 */
function testPlanGenerationGating() {
  console.log('=== Testing Plan Generation Gating ===');
  
  const { canGeneratePlan, missingPlanFields } = require('./stepGating.js');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Empty brief should block plan generation
  try {
    const empty = {};
    const canGen = canGeneratePlan(empty);
    const missing = missingPlanFields(empty);
    
    if (!canGen && missing.length > 0) {
      console.log('✅ Empty brief blocks plan generation');
      passed++;
    } else {
      console.log('❌ Empty brief should block plan generation');
      console.log('  canGenerate:', canGen, 'missing:', missing);
      failed++;
    }
  } catch (e) {
    console.log('❌ Empty brief test failed:', e.message);
    failed++;
  }
  
  // Test 2: Partial brief should block plan generation
  try {
    const partial = {
      product_brand: 'Test',
      campaign_objective: 'Awareness'
      // Missing: industry, geography, budget_rm
    };
    const canGen = canGeneratePlan(partial);
    const missing = missingPlanFields(partial);
    
    if (!canGen && missing.length === 3) {
      console.log('✅ Partial brief blocks plan generation');
      passed++;
    } else {
      console.log('❌ Partial brief should block plan generation');
      console.log('  canGenerate:', canGen, 'missing:', missing);
      failed++;
    }
  } catch (e) {
    console.log('❌ Partial brief test failed:', e.message);
    failed++;
  }
  
  // Test 3: Complete brief should allow plan generation
  try {
    const complete = {
      product_brand: 'Test Brand',
      campaign_objective: 'Awareness',
      industry: 'Retail',
      geography: ['Kuala Lumpur'],
      budget_rm: 50000
    };
    const canGen = canGeneratePlan(complete);
    const missing = missingPlanFields(complete);
    
    if (canGen && missing.length === 0) {
      console.log('✅ Complete brief allows plan generation');
      passed++;
    } else {
      console.log('❌ Complete brief should allow plan generation');
      console.log('  canGenerate:', canGen, 'missing:', missing);
      failed++;
    }
  } catch (e) {
    console.log('❌ Complete brief test failed:', e.message);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

/**
 * Integration test: Full wizard flow simulation
 */
function testFullWizardFlow() {
  console.log('=== Testing Full Wizard Flow Integration ===');
  
  const { WizardRequestManager } = require('./wizardRequestManager.js');
  const { normalizeModelResponse } = require('./responseNormalizer.js');
  const { mergeBriefSafely } = require('./briefMerger.js');
  const { canGeneratePlan } = require('./stepGating.js');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Simulate wizard flow
    const manager = new WizardRequestManager();
    let brief = {};
    
    // Step 1: User says "I want to launch a new perfume"
    const req1 = manager.startRequest();
    const response1 = normalizeModelResponse({
      response: "Great! What's the brand name?",
      extractedEntities: {
        campaign_objective: 'Awareness',
        industry: 'Beauty'
      }
    });
    
    if (manager.shouldApplyResponse(req1.requestId)) {
      brief = mergeBriefSafely(brief, response1.extractedEntities, req1.requestId);
    }
    manager.completeRequest(req1.requestId);
    
    // Step 2: User says "Lancome, budget is 50000"
    const req2 = manager.startRequest();
    const response2 = normalizeModelResponse({
      response: "Perfect! Which regions?",
      extractedEntities: {
        product_brand: 'Lancome',
        budget_rm: 50000
      }
    });
    
    if (manager.shouldApplyResponse(req2.requestId)) {
      brief = mergeBriefSafely(brief, response2.extractedEntities, req2.requestId);
    }
    manager.completeRequest(req2.requestId);
    
    // Step 3: User says "Kuala Lumpur"
    const req3 = manager.startRequest();
    const response3 = normalizeModelResponse({
      response: "Got it! Let me create your plan.",
      extractedEntities: {
        geography: ['Kuala Lumpur']
      }
    });
    
    if (manager.shouldApplyResponse(req3.requestId)) {
      brief = mergeBriefSafely(brief, response3.extractedEntities, req3.requestId);
    }
    manager.completeRequest(req3.requestId);
    
    // Check final state
    const canGen = canGeneratePlan(brief);
    const hasAllFields = 
      brief.product_brand === 'Lancome' &&
      brief.campaign_objective === 'Awareness' &&
      brief.industry === 'Beauty' &&
      brief.budget_rm === 50000 &&
      Array.isArray(brief.geography) &&
      brief.geography[0] === 'Kuala Lumpur';
    
    if (canGen && hasAllFields) {
      console.log('✅ Full wizard flow completed successfully');
      console.log('  Final brief:', JSON.stringify(brief, null, 2));
      passed++;
    } else {
      console.log('❌ Full wizard flow failed');
      console.log('  canGenerate:', canGen);
      console.log('  hasAllFields:', hasAllFields);
      console.log('  Brief:', brief);
      failed++;
    }
    
  } catch (e) {
    console.log('❌ Full wizard flow test failed:', e.message);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

/**
 * Run all tests
 */
export function runAllWizardTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AI WIZARD PRODUCTION FIXES - COMPREHENSIVE TEST SUITE  ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n');
  
  const results = {
    normalization: runNormalizationTests(),
    stepGating: runStepGatingTests(),
    briefMerge: runBriefMergeTests(),
    duplicatePrevention: testDuplicateRequestPrevention(),
    outOfOrder: testOutOfOrderResponses(),
    malformedJson: testMalformedJsonHandling(),
    planGating: testPlanGenerationGating(),
    fullFlow: testFullWizardFlow()
  };
  
  // Calculate totals
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [category, result] of Object.entries(results)) {
    totalPassed += result.passed;
    totalFailed += result.failed;
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FINAL RESULTS  ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : '✅'}`);
  console.log(`Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n');
  
  return results;
}

/**
 * Quick smoke test for production deployment
 */
export function runSmokeTests() {
  console.log('🔥 Running Smoke Tests...\n');
  
  const tests = [
    testDuplicateRequestPrevention,
    testMalformedJsonHandling,
    testPlanGenerationGating
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = test();
    if (result.failed > 0) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n✅ All smoke tests passed! Safe to deploy.\n');
  } else {
    console.log('\n❌ Some smoke tests failed. Do not deploy!\n');
  }
  
  return allPassed;
}
