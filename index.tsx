
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { UserRequest, OrchestratorResponse } from './types';
import { runOrchestrator } from './services/orchestratorSkeleton';
import { InputForm } from './components/InputForm';
import { ResultDisplay } from './components/ResultDisplay';

// Import tests for debugging in console
import { runSanityCheck } from './tests/orchestrator.test';

const App: React.FC = () => {
  const [request, setRequest] = useState<UserRequest>({
    images: [],
    raw_text: '',
    platform: 'wechat_moments',
    mood_user: 'tired',
    intent_user: 'seek_empathy',
    refine_mode: 'none',
    enable_l4_loop: false,
    performance_mode: 'fast', // Default to fast mode
    language: 'en' // Default to English
  });

  const [response, setResponse] = useState<OrchestratorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | undefined>(undefined);

  // Expose test function to window for manual debugging
  useEffect(() => {
    (window as any).runSanityCheck = runSanityCheck;
    console.log("🐛 Debug: Test is ready. Run `window.runSanityCheck()` in console to start.");
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Use action 'create' explicitly for new submissions
    const newRequest: UserRequest = { ...request, action: 'create' };
    
    try {
      const result = await runOrchestrator(newRequest);
      setResponse(result);
      setCurrentTraceId(result.traceId);
      
      // Reset refinement state
      setRequest(prev => ({ 
          ...prev, 
          action: undefined, 
          variant_id: undefined,
          refine_mode: 'none',
          refine_instruction: undefined
      }));
    } catch (error) {
      console.error("Failed to generate:", error);
      alert(request.language === 'en' ? "Generation failed, check console." : "生成失败，请查看控制台日志");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (
      variantId: string, 
      mode: 'more_literary' | 'more_realistic' | 'lighter' | 'none', 
      instruction: string,
      refineImageIndex?: number
  ) => {
      if (!currentTraceId) {
          alert(request.language === 'en' ? "Session expired. Please generate new content." : "Session expired. Please generate new content.");
          return;
      }

      // 1. Prepare request for refinement
      const refineRequest: UserRequest = {
          ...request,
          action: 'refine',
          traceId: currentTraceId, // MUST PASS TRACE ID
          variant_id: variantId,
          refine_mode: mode,
          refine_instruction: instruction,
          performance_mode: request.performance_mode,
          // NEW: Explicit image index to refine
          refine_image_index: refineImageIndex 
      };
      
      // 2. Set request state
      setRequest(refineRequest);
      
      // 3. Trigger orchestrator manually
      setIsLoading(true);
      try {
          const result = await runOrchestrator(refineRequest);
          setResponse(result);
          // Trace ID remains the same
          
          setRequest(prev => ({ 
             ...prev, 
             action: undefined, 
             variant_id: undefined,
             refine_mode: 'none',
             refine_instruction: undefined
         }));
      } catch (error) {
          console.error("Refine failed:", error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleReset = () => {
    setRequest({
      images: [],
      raw_text: '',
      platform: 'wechat_moments',
      mood_user: 'tired',
      intent_user: 'seek_empathy',
      refine_mode: 'none',
      enable_l4_loop: false,
      performance_mode: 'fast',
      language: request.language // Preserve language preference
    });
    setResponse(null);
    setCurrentTraceId(undefined);
  };

  return (
    <div className="h-screen bg-[#Fdfdfd] text-gray-900 font-sans selection:bg-purple-100 overflow-hidden flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto px-4 py-6 h-full flex flex-col">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">AmplifyMe</h1>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden h-full">
          {/* Left Panel: Input (Fixed width) */}
          <div className="w-full md:w-[400px] h-full flex-shrink-0">
            <InputForm 
              request={request} 
              onChange={setRequest} 
              onSubmit={handleSubmit}
              onReset={handleReset}
              isLoading={isLoading}
              hasResult={!!response}
            />
          </div>

          {/* Right Panel: Output (Flexible) */}
          <div className="flex-1 h-full min-w-0">
            <ResultDisplay 
                response={response} 
                isLoading={isLoading} 
                request={request}
                onRefine={handleRefine}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
