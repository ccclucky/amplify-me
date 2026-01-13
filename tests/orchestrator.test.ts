import { runOrchestrator } from '../services/orchestratorSkeleton';
import { UserRequest } from '../types';

export const runSanityCheck = async () => {
  console.group('🧪 [Test] Orchestrator New L1-L3 Architecture Sanity Check');
  
  const mockRequest: UserRequest = {
    images: [], // Pass empty array, will skip image generation but test text flow
    raw_text: "今天下班路上一个人走回家，好像有点累。",
    platform: "wechat_moments",
    mood_user: "tired",
    intent_user: "seek_empathy",
    action: 'create',
    performance_mode: 'fast'
  };

  try {
    // 2. Integration Check
    console.log('--- Integration Test: Orchestrator ---');
    console.log('1. Sending Mock Request:', mockRequest);
    const start = performance.now();
    const response = await runOrchestrator(mockRequest);
    const end = performance.now();
    
    console.log(`2. Received Response (${Math.round(end - start)}ms):`, response);

    // Assertions
    let passed = true;
    
    // Check New Fields
    if (!response.understanding) {
        console.error('❌ Failed: Understanding Bundle missing');
        passed = false;
    } else {
        console.log('✅ Understanding Bundle present');
        if (!response.understanding.story_core) console.warn('⚠️ Story Core empty?');
    }

    // Check Trace ID
    if (!response.traceId) {
        console.error('❌ Failed: Trace ID missing');
        passed = false;
    }

    // Check Variants
    if (!response.variants || response.variants.length === 0) {
      console.error('❌ Failed: No variants generated');
      passed = false;
    } else {
      const v = response.variants[0];
      if (v.copy && v.copy.main_text) {
          console.log(`✅ Copy generated: "${v.copy.main_text.substring(0, 20)}..."`);
      } else {
          console.error('❌ Failed: Variant copy missing');
          passed = false;
      }
    }

    if (passed) {
      console.log('✅ All Architecture Checks Passed');
    } else {
      console.error('❌ Some Checks Failed');
    }
  } catch (e) {
    console.error('❌ Sanity Check Exception:', e);
  } finally {
    console.groupEnd();
  }
};