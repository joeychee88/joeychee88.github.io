/**
 * Test suite for production-grade AI Wizard fixes
 * 
 * Run with: node frontend/src/utils/__tests__/wizardFixes.test.js
 * Or import and call runAllTests() from browser console
 */

import requestManager from '../wizardRequestManager.js';
import { normalizeModelResponse, validateAssistantText } from '../responseNormalizer.js';
import { canGeneratePlan, canAdvanceStep, getMissingFields } from '../stepGating.js';
import { mergeBrief } from '../briefMerge.js';

/**
 * Test 1: Duplicate send prevention
 */
function testDuplicateSendPrevention() {
  console.log('\n=== TEST 1: Duplicate Send Prevention ===');
  
  requestManager.reset();
  
  // First request should succeed
  const request1 = requestManager.startRequest();
  console.log('Request 1 started:', request1.requestId);
  
  // Second request should abort first
  const canSend = requestManager.canSendRequest();
  console.log('Can send another request?', canSend); // Should be false
  
  // Force a second request (simulating user rapid clicks)
  const request2 = requestManager.startRequest();
  console.log('Request 2 started (aborted request 1):', request2.requestId);
  
  // Verify latest is request 2
  const isLatest1 = requestManager.shouldApplyResponse(request1.requestId);
  const isLatest2 = requestManager.shouldApplyResponse(request2.requestId);
  
  console.log('Request 1 should apply?', isLatest1); // Should be false
  console.log('Request 2 should apply?', isLatest2); // Should be true
  
  requestManager.completeRequest(request2.requestId);
  
  const result = !canSend && !isLatest1 && isLatest2;
  console.log('✓ TEST 1:', result ? 'PASSED' : 'FAILED');
  return result;
}

/**
 * Test 2: Out-of-order response handling
 */
function testOutOfOrderResponses() {
  console.log('\n=== TEST 2: Out-of-Order Response Handling ===');
  
  requestManager.reset();
  
  // Send 3 requests in sequence
  const req1 = requestManager.startRequest();
  requestManager.completeRequest(req1.requestId);
  
  const req2 = requestManager.startRequest();
  requestManager.completeRequest(req2.requestId);
  
  const req3 = requestManager.startRequest();
  // req3 still in flight
  
  // Now responses come back out of order: req1, req3, req2
  const shouldApply1 = requestManager.shouldApplyResponse(req1.requestId);
  const shouldApply2 = requestManager.shouldApplyResponse(req2.requestId);
  const shouldApply3 = requestManager.shouldApplyResponse(req3.requestId);
  
  console.log('Should apply req1?', shouldApply1); // false (stale)
  console.log('Should apply req2?', shouldApply2); // false (stale)
  console.log('Should apply req3?', shouldApply3); // true (latest)
  
  const result = !shouldApply1 && !shouldApply2 && shouldApply3;
  console.log('✓ TEST 2:', result ? 'PASSED' : 'FAILED');
  return result;
}

/**
 * Test 3: JSON string normalization
 */
function testJsonNormalization() {
  console.log('\n=== TEST 3: JSON String Normalization ===');
  
  const tests = [
    {
      name: 'Valid JSON string',
      input: '{"response": "Hello world", "extractedEntities": {"budget": 1000}}',
      expectText: 'Hello world',
      expectEntity: 1000
    },
    {
      name: 'Object input',
      input: { response: 'Test message', extractedEntities: { industry: 'Tech' } },
      expectText: 'Test message',
      expectEntity: 'Tech'
    },
    {
      name: 'Plain text',
      input: 'Just plain text here',
      expectText: 'Just plain text here',
      expectEntity: null
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = normalizeModelResponse(test.input);
    const textMatch = result.assistantText === test.expectText;
    const entityKey = test.expectEntity !== null 
      ? Object.keys(test.input.extractedEntities || {})[0] 
      : null;
    const entityMatch = test.expectEntity === null 
      ? Object.keys(result.extractedEntities).length === 0
      : result.extractedEntities[entityKey] === test.expectEntity;
    
    const passed = textMatch && entityMatch;
    console.log(`  ${test.name}:`, passed ? 'PASS' : 'FAIL');
    if (!passed) {
      console.log('    Expected text:', test.expectText);
      console.log('    Got text:', result.assistantText);
      console.log('    Expected entity:', test.expectEntity);
      console.log('    Got entities:', result.extractedEntities);
    }
    allPassed = allPassed && passed;
  }
  
  console.log('✓ TEST 3:', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

/**
 * Test 4: Malformed JSON handling
 */
function testMalformedJson() {
  console.log('\n=== TEST 4: Malformed JSON Handling ===');
  
  const tests = [
    {
      name: 'Missing closing brace',
      input: '{"response": "Test message"',
      shouldNotCrash: true
    },
    {
      name: 'Invalid quotes',
      input: "{response: 'Test', extractedEntities: {x: 1}}",
      shouldNotCrash: true
    },
    {
      name: 'Nested objects',
      input: '{"response": "Test", "nested": {"a": {"b": 1}}}',
      shouldNotCrash: true
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const result = normalizeModelResponse(test.input);
      const hasText = result.assistantText && result.assistantText.length > 0;
      const passed = hasText;
      console.log(`  ${test.name}:`, passed ? 'PASS' : 'FAIL');
      if (!passed) {
        console.log('    Result:', result);
      }
      allPassed = allPassed && passed;
    } catch (e) {
      console.log(`  ${test.name}: FAIL (threw error:`, e.message + ')');
      allPassed = false;
    }
  }
  
  console.log('✓ TEST 4:', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

/**
 * Test 5: Step gating
 */
function testStepGating() {
  console.log('\n=== TEST 5: Step Gating ===');
  
  const tests = [
    {
      name: 'Empty brief - cannot generate',
      brief: {},
      datasets: { rates: [1], formats: [1], audiences: [1], sites: [1] },
      shouldGenerate: false
    },
    {
      name: 'Missing budget - cannot generate',
      brief: {
        product_brand: 'TestBrand',
        campaign_objective: 'Awareness',
        industry: 'Tech',
        geography: ['Malaysia']
      },
      datasets: { rates: [1], formats: [1], audiences: [1], sites: [1] },
      shouldGenerate: false
    },
    {
      name: 'All required fields - can generate',
      brief: {
        product_brand: 'TestBrand',
        campaign_objective: 'Awareness',
        industry: 'Tech',
        geography: ['Malaysia'],
        budget_rm: 100000
      },
      datasets: { rates: [1], formats: [1], audiences: [1], sites: [1] },
      shouldGenerate: true
    },
    {
      name: 'All fields but no datasets - cannot generate',
      brief: {
        product_brand: 'TestBrand',
        campaign_objective: 'Awareness',
        industry: 'Tech',
        geography: ['Malaysia'],
        budget_rm: 100000
      },
      datasets: { rates: [], formats: [], audiences: [], sites: [] },
      shouldGenerate: false
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = canGeneratePlan(test.brief, test.datasets);
    const passed = result.canGenerate === test.shouldGenerate;
    console.log(`  ${test.name}:`, passed ? 'PASS' : 'FAIL');
    if (!passed) {
      console.log('    Expected:', test.shouldGenerate);
      console.log('    Got:', result.canGenerate);
      console.log('    Reason:', result.reason);
      console.log('    Missing:', result.missingFields);
    }
    allPassed = allPassed && passed;
  }
  
  console.log('✓ TEST 5:', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

/**
 * Test 6: Brief merging
 */
function testBriefMerging() {
  console.log('\n=== TEST 6: Brief Merging ===');
  
  const tests = [
    {
      name: 'Add new field',
      current: { budget_rm: 1000 },
      extracted: { industry: 'Tech' },
      check: (result) => result.budget_rm === 1000 && result.industry === 'Tech'
    },
    {
      name: 'Dont overwrite with null',
      current: { budget_rm: 1000 },
      extracted: { budget_rm: null },
      check: (result) => result.budget_rm === 1000
    },
    {
      name: 'Update with new value',
      current: { budget_rm: 1000 },
      extracted: { budget_rm: 2000 },
      check: (result) => result.budget_rm === 2000
    },
    {
      name: 'Replace non-empty array',
      current: { geography: ['KL'] },
      extracted: { geography: ['Selangor'] },
      check: (result) => result.geography.length === 1 && result.geography[0] === 'Selangor'
    },
    {
      name: 'Keep array if new is empty',
      current: { geography: ['KL'] },
      extracted: { geography: [] },
      check: (result) => result.geography.length === 1 && result.geography[0] === 'KL'
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = mergeBrief(test.current, test.extracted, 'test-req');
    const passed = test.check(result);
    console.log(`  ${test.name}:`, passed ? 'PASS' : 'FAIL');
    if (!passed) {
      console.log('    Result:', result);
    }
    allPassed = allPassed && passed;
  }
  
  console.log('✓ TEST 6:', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  AI Wizard Production-Grade Fixes - Test Suite       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  const results = {
    test1: testDuplicateSendPrevention(),
    test2: testOutOfOrderResponses(),
    test3: testJsonNormalization(),
    test4: testMalformedJson(),
    test5: testStepGating(),
    test6: testBriefMerging()
  };
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║  SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  return results;
}

// Auto-run if executed directly (Node.js)
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests();
}

// Export for browser
if (typeof window !== 'undefined') {
  window.runWizardTests = runAllTests;
  console.log('Tests loaded. Run window.runWizardTests() to execute.');
}
