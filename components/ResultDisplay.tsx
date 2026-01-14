
import React, { useState, useEffect } from 'react';
import { OrchestratorResponse, Variant, UserRequest } from '../types';
import { translations } from '../locales';

interface ResultDisplayProps {
  response: OrchestratorResponse | null;
  isLoading: boolean;
  request: UserRequest;
  onRefine: (variantId: string, mode: 'more_literary' | 'more_realistic' | 'lighter' | 'none', instruction: string, imageIndex?: number) => void;
}

// ==========================================
// Data Adapter for Mockups
// ==========================================
interface MockupData {
  avatarGradient: string;
  nickname: string;
  content: string;
  title?: string; // For XHS
  images: string[];
  tags: string[];
  date: string;
  isEnhanced: boolean;
  enhancedImages?: string[]; // Array of enhanced
  lang: string;
}

// ==========================================
// Helper: WeChat Authentic Image Grid
// ==========================================
const WeChatImageGrid: React.FC<{ 
    images: string[]; 
    enhancedImages?: string[];
    activeIndex: number;
    onImageSelect: (index: number) => void;
}> = ({
  images,
  enhancedImages,
  activeIndex,
  onImageSelect
}) => {
  if (!images || images.length === 0) return null;

  const displayImages = images.map((original, i) => enhancedImages?.[i] || original);
  const count = displayImages.length;

  const EnhancedBadge = ({ idx }: { idx: number }) =>
    enhancedImages && enhancedImages[idx] && enhancedImages[idx] !== images[idx] ? (
      <div className="absolute top-1 left-1 bg-purple-500/90 backdrop-blur-sm text-white text-[8px] px-1 py-0.5 rounded-[3px] shadow-sm z-10 flex items-center gap-1 font-semibold tracking-wider uppercase opacity-90 pointer-events-none">
        AI
      </div>
    ) : null;

  const imageClass = (idx: number) => 
     `w-full h-full object-cover cursor-pointer transition-all ${activeIndex === idx ? 'ring-4 ring-purple-400 z-10' : 'hover:opacity-90'}`;

  if (count === 1) {
    return (
      <div 
        className="max-w-[200px] max-h-[280px] overflow-hidden mt-2 relative bg-[#f5f5f5] flex-shrink-0"
        onClick={() => onImageSelect(0)}
      >
        <EnhancedBadge idx={0} />
        <img src={displayImages[0]} alt="moment" className={imageClass(0)} />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-[4px] mt-2 w-[180px] relative">
        {displayImages.map((url, i) => (
          <div key={i} className="aspect-square bg-[#f5f5f5] overflow-hidden relative" onClick={() => onImageSelect(i)}>
            <EnhancedBadge idx={i} />
            <img src={url} alt={`grid-${i}`} className={imageClass(i)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[4px] mt-2 max-w-[270px] relative">
      {displayImages.map((url, i) => (
        <div key={i} className="aspect-square bg-[#f5f5f5] overflow-hidden relative" onClick={() => onImageSelect(i)}>
          <EnhancedBadge idx={i} />
          <img src={url} alt={`grid-${i}`} className={imageClass(i)} />
        </div>
      ))}
    </div>
  );
};

// ==========================================
// Helper: XHS Image Grid / Carousel
// ==========================================
const XHSImageGrid: React.FC<{ 
    images: string[]; 
    enhancedImages?: string[];
    activeIndex: number;
    onIndexChange: (index: number) => void;
    lang: string;
}> = ({
  images,
  enhancedImages,
  activeIndex,
  onIndexChange,
  lang
}) => {
  const t = translations[lang] || translations['en'];
  
  if (!images || images.length === 0) return null;

  const displayImages = images.map((original, i) => enhancedImages?.[i] || original);
  const total = displayImages.length;

  const isCurrentEnhanced = enhancedImages && enhancedImages[activeIndex] && enhancedImages[activeIndex] !== images[activeIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(activeIndex > 0 ? activeIndex - 1 : activeIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(activeIndex < total - 1 ? activeIndex + 1 : activeIndex);
  };

  return (
    <div className="w-full aspect-[3/4] bg-gray-100 overflow-hidden relative group select-none">
      {isCurrentEnhanced && (
        <div className="absolute top-3 left-3 bg-purple-500/80 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full z-10">
          ✨ {t.ai_enhanced}
        </div>
      )}
      
      {!isCurrentEnhanced && enhancedImages && (
          <div className="absolute top-3 left-3 bg-gray-900/40 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full z-10">
          {t.preview_mode}
        </div>
      )}

      {/* Image Slider */}
      <div 
        className="w-full h-full flex transition-transform duration-300 ease-out" 
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {displayImages.map((src, i) => (
          <img key={i} src={src} alt={`slide-${i}`} className="w-full h-full object-cover flex-shrink-0" />
        ))}
      </div>

      {/* Counter Badge */}
      {total > 1 && (
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white/90 text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide z-10">
          {activeIndex + 1}/{total}
        </div>
      )}

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          {activeIndex > 0 && (
            <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur rounded-full shadow-sm flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 transition-all z-20"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {activeIndex < total - 1 && (
            <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur rounded-full shadow-sm flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 transition-all z-20"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
          {displayImages.slice(0, 6).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${
                i === activeIndex ? 'bg-white scale-125' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Sub-Components: Phone Mockups
// ==========================================

const WeChatMomentMockup: React.FC<{ 
    data: MockupData; 
    activeIndex: number;
    onImageSelect: (index: number) => void;
}> = ({ data, activeIndex, onImageSelect }) => {
  const t = translations[data.lang] || translations['en'];

  return (
    <div className="bg-white w-full h-full flex flex-col text-[#111] font-sans">
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
        {/* Cover */}
        <div className="w-full h-[220px] relative mb-6">
          <div className="w-full h-full overflow-hidden bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=800&auto=format&fit=crop"
              className="w-full h-full object-cover opacity-80"
              alt="cover"
            />
          </div>
          <div className="absolute -bottom-3 right-4 flex items-end gap-3 z-20">
            <div className="text-white font-semibold text-[15px] mb-3 drop-shadow-md tracking-tight">
              {data.nickname}
            </div>
            <div className="w-[56px] h-[56px] rounded-[8px] bg-gray-100 overflow-hidden border-[2px] border-white">
              <div className={`w-full h-full bg-gradient-to-br ${data.avatarGradient}`}></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-20 pt-2 flex gap-3">
          <div className="w-[36px] h-[36px] rounded-[6px] bg-gray-100 flex-shrink-0 overflow-hidden mt-0.5">
            <div className={`w-full h-full bg-gradient-to-br ${data.avatarGradient}`}></div>
          </div>
          <div className="flex-1 border-b border-gray-50 pb-4">
            <h4 className="font-semibold text-[#576B95] text-[15px] mb-1 leading-tight">
              {data.nickname}
            </h4>
            {data.content ? (
              <p className="text-[15px] text-[#111] leading-[1.6] mb-2 whitespace-pre-wrap break-words tracking-wide">
                {data.content}
              </p>
            ) : (
              <p className="text-[14px] text-gray-300 italic mb-2">{t.generated_placeholder}</p>
            )}
            <WeChatImageGrid 
                images={data.images} 
                enhancedImages={data.enhancedImages} 
                activeIndex={activeIndex}
                onImageSelect={onImageSelect}
            />
            <div className="flex justify-between items-center mt-3 h-5">
              <span className="text-[12px] text-gray-400 font-normal">{data.date}</span>
              <div className="w-[32px] h-[18px] bg-[#F7F7F7] rounded-[4px] flex items-center justify-center gap-[3px] cursor-pointer">
                <div className="w-[4px] h-[4px] bg-[#576B95] rounded-full"></div>
                <div className="w-[4px] h-[4px] bg-[#576B95] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const XHSNoteMockup: React.FC<{ 
    data: MockupData;
    activeIndex: number;
    onIndexChange: (index: number) => void;
}> = ({ data, activeIndex, onIndexChange }) => {
  const t = translations[data.lang] || translations['en'];

  return (
    <div className="bg-white w-full h-full flex flex-col text-[#333] font-sans relative overflow-hidden">
      {/* Top Bar Simulated */}
      <div className="h-[44px] px-4 flex items-center justify-between absolute top-[44px] w-full z-20 pointer-events-none text-white mix-blend-difference opacity-80">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <div className="flex gap-1.5">
          <div className="w-1 h-1 rounded-full bg-white" />
          <div className="w-1 h-1 rounded-full bg-white" />
          <div className="w-1 h-1 rounded-full bg-white" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        <XHSImageGrid 
            images={data.images} 
            enhancedImages={data.enhancedImages} 
            activeIndex={activeIndex}
            onIndexChange={onIndexChange}
            lang={data.lang}
        />
        <div className="px-4 pt-3 pb-6">
          <h2 className="font-semibold text-[17px] mb-2 leading-[1.4] text-[#333] tracking-tight">
            {data.title || (data.content ? data.content.slice(0, 15) : '')}
          </h2>
          <p className="text-[15px] text-[#333] leading-[1.6] mb-4 whitespace-pre-wrap font-normal">
            {data.content || t.generated_placeholder}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-6 text-[13px] text-[#13386c]">
            {data.tags.map((t, i) => (
              <span key={i}>{t.startsWith('#') ? t : `#${t}`}</span>
            ))}
          </div>
          <div className="text-[11px] text-gray-300 flex items-center gap-2 mb-6">
            <span>{data.date}</span>
            <span className="text-[9px]">•</span>
            <span>Shanghai</span>
          </div>
          <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-50 p-0.5">
                <div className={`w-full h-full rounded-full bg-gradient-to-tr ${data.avatarGradient}`}></div>
              </div>
              <span className="text-[12px] text-gray-500 font-medium">{data.nickname}</span>
            </div>
            <button className={`text-[12px] px-4 py-1.5 rounded-full font-semibold border ${
                data.isEnhanced ? 'text-red-500 border-red-500/30 bg-red-50/50' : 'text-gray-400 border-gray-200'
            }`}>
              {t.follow}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-[70px] border-t border-gray-50 bg-white flex items-start pt-3 justify-between px-5 absolute bottom-0 w-full z-30">
        <div className="bg-[#F5F5F5] rounded-full px-4 py-2 h-[36px] flex items-center text-[13px] text-gray-400 flex-1 mr-6">
          {t.say_something}
        </div>
        <div className="flex gap-5 text-gray-600">
           <svg className={data.isEnhanced ? 'text-red-500 fill-red-500' : ''} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
           <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M12 21a9 9 0 1 0-9-9c0 4.97 4.03 9 9 9z" /><path d="M12 8v4l3 3" /></svg>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Phone Container Frame
// ==========================================
const PhoneFrame: React.FC<{ children: React.ReactNode; isResult?: boolean }> = ({
  children,
  isResult,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative w-[310px] h-[610px] bg-white rounded-[40px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border-[8px] border-gray-900 overflow-hidden flex-shrink-0 transition-all duration-300 ${
           isResult ? 'ring-4 ring-purple-100' : ''
        }`}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-gray-900 rounded-b-[16px] z-50 pointer-events-none" />
        <div className="w-full h-full bg-white overflow-hidden relative">
           {children}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-black/20 rounded-full z-50 pointer-events-none mix-blend-multiply" />
      </div>
    </div>
  );
};

// ==========================================
// Main Component
// ==========================================

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  response,
  isLoading,
  request,
  onRefine,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [refineInput, setRefineInput] = useState('');
  // New state to track which image is active in the viewer
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const lang = request.language || 'en';
  const t = translations[lang];

  useEffect(() => {
    const urls = request.images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [request.images]);

  useEffect(() => {
    // If response changes (e.g. after refine), default to the new variant
    if (response?.variants && response.variants.length > 0) {
       setSelectedVariantId(response.variants[0].id);
    }
  }, [response]);

  const activeVariant = response?.variants.find((v) => v.id === selectedVariantId) || response?.variants[0];

  const handleCopy = () => {
    if (!activeVariant) return;
    const text = [
      activeVariant.copy.title,
      activeVariant.copy.main_text,
      activeVariant.copy.hash_tags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!activeVariant?.enhanced_images_base64?.[activeImageIndex]) return;
    const link = document.createElement('a');
    link.href = activeVariant.enhanced_images_base64[activeImageIndex];
    link.download = `AmplifyMe_Enhanced_${Date.now()}_${activeImageIndex}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerRefine = (mode: 'more_literary' | 'more_realistic' | 'lighter' | 'none') => {
      if (activeVariant) {
          onRefine(activeVariant.id, mode, refineInput, activeImageIndex);
          setRefineInput(''); // Clear input after submit
      }
  };

  // --- Mockup Data Preparation ---

  const rawMockupData: MockupData = {
    avatarGradient: 'from-gray-200 to-gray-300',
    nickname: 'Me',
    content: request.raw_text || '',
    title: 'Draft',
    images: previewUrls,
    tags: [],
    date: 'Just now',
    isEnhanced: false,
    lang: lang
  };
  
  // Determine if we are in enhanced mode (Quality mode or user processed images)
  const isVariantEnhanced = activeVariant?.enhanced_images_base64 && 
                            activeVariant.enhanced_images_base64.length > 0 &&
                            activeVariant.enhanced_images_base64[0].startsWith('data:image/'); // Basic check

  const resultMockupData: MockupData | null = activeVariant
    ? {
        avatarGradient: 'from-indigo-300 to-purple-300',
        nickname: 'AmplifyMe',
        content: activeVariant.copy.main_text,
        title: activeVariant.copy.title,
        images: previewUrls,
        tags: activeVariant.copy.hash_tags,
        date: '1m ago',
        isEnhanced: isVariantEnhanced || false,
        enhancedImages: activeVariant.enhanced_images_base64,
        lang: lang
      }
    : null;

  // --- Initial Loading State (No previous data) ---
  if (isLoading && !response) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#FDFDFD] rounded-3xl border border-dashed border-gray-200 text-gray-500 gap-4">
        <div className="relative">
             <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-purple-600 animate-pulse">AI</div>
        </div>
        <div className="text-center">
             <p className="font-medium tracking-wide text-sm text-gray-700">{t.loading_text}</p>
             <p className="text-[11px] text-gray-400 mt-1">Giving feelings a moment...</p>
        </div>
      </div>
    );
  }

  // --- Empty State ---
  if (!response && !request.raw_text && request.images.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#FDFDFD] rounded-3xl border border-gray-100 text-gray-300 gap-4">
        <div className="p-4 bg-gray-50 rounded-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        </div>
        <p className="text-sm font-light tracking-wider">{t.result_empty}</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#f8fafc] rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col relative overflow-hidden">
      
      {/* Loading Overlay for Progressive Update */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
             <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3"></div>
             <p className="text-sm font-semibold text-gray-700">{t.loading_update}</p>
        </div>
      )}

      {/* SCROLLABLE AREA: Empathy + Mockups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 1. Empathy Header */}
        {response && (
            <div className="bg-white border-b border-gray-100 shadow-sm z-10 relative">
                <div className="px-8 py-8 max-w-4xl mx-auto flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-500 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div className="flex-1">
                        <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-2xl rounded-tl-none px-6 py-4 text-[#475569] leading-relaxed shadow-sm border border-purple-100/50">
                            <p className="text-[15px] font-medium">{response.empathic_reply}</p>
                        </div>
                    </div>
                </div>
                
                {/* Style Cards */}
                <div className="px-6 pb-6 max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {response.variants.map((v) => {
                        const isSelected = selectedVariantId === v.id;
                        return (
                        <button
                            key={v.id}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                            isSelected
                                ? 'bg-purple-50/50 border-purple-400 text-purple-900 shadow-md shadow-purple-100/50'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600 hover:shadow-sm'
                            }`}
                        >
                            <span className="font-bold text-sm text-gray-900">{v.style_name}</span>
                            <span className="text-[11px] opacity-80 leading-tight">{v.tone_direction}</span>
                        </button>
                        );
                    })}
                </div>
                </div>
            </div>
        )}

        {/* 2. Comparison Phones */}
        <div className="py-10 px-2 flex justify-center items-start bg-[#f8fafc]">
            <div className="flex flex-col xl:flex-row gap-8 xl:gap-16 items-center xl:items-start">
            
            {/* LEFT (Original) */}
            <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <PhoneFrame>
                    {request.platform === 'xiaohongshu' ? 
                        <XHSNoteMockup 
                            data={rawMockupData} 
                            activeIndex={activeImageIndex}
                            onIndexChange={setActiveImageIndex}
                        /> : 
                        <WeChatMomentMockup 
                            data={rawMockupData} 
                            activeIndex={activeImageIndex}
                            onImageSelect={setActiveImageIndex}
                        />
                    }
                </PhoneFrame>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">{t.original}</span>
            </div>

            {/* ARROW */}
            <div className="hidden xl:flex flex-col items-center justify-center h-[600px] text-gray-300 opacity-50">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
            </div>

            {/* RIGHT (Refined) */}
            <div className="flex flex-col items-center gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {resultMockupData ? (
                    <div className="flex flex-col items-center gap-6">
                    <PhoneFrame isResult>
                        {request.platform === 'xiaohongshu' ? 
                            <XHSNoteMockup 
                                data={resultMockupData}
                                activeIndex={activeImageIndex}
                                onIndexChange={setActiveImageIndex}
                            /> : 
                            <WeChatMomentMockup 
                                data={resultMockupData}
                                activeIndex={activeImageIndex}
                                onImageSelect={setActiveImageIndex}
                            />
                        }
                    </PhoneFrame>

                    <div className="w-full max-w-[340px] flex flex-col gap-4">
                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{t.actions_title}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    isVariantEnhanced ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {isVariantEnhanced ? t.ai_enhanced : t.preview_mode}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={handleCopy}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                        copied
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-200 hover:text-purple-600'
                                    }`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.24a2 2 0 0 0-.59-1.42l-3.83-3.83A2 2 0 0 0 14.17 2H10a2 2 0 0 0-2 2z"/><path d="M16 2v4a2 2 0 0 0 2 2h4"/><path d="M21 14H8"/><path d="M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/></svg>
                                    {copied ? t.copied : t.copy_btn}
                                </button>
                                <button 
                                    onClick={handleDownloadImage}
                                    disabled={!activeVariant?.enhanced_images_base64?.length}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                        activeVariant?.enhanced_images_base64?.length
                                            ? 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-200 hover:text-purple-600'
                                            : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                                    }`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    {t.save_img}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{t.refine_title}</span>
                                <span className="text-[10px] text-gray-400">{t.refine_hint}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button onClick={() => triggerRefine('more_literary')} className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-purple-50 text-[11px] text-gray-600 hover:text-purple-600 font-medium transition-colors border border-gray-200 hover:border-purple-200 shadow-sm">{t.refine_modes.more_literary}</button>
                                <button onClick={() => triggerRefine('more_realistic')} className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-purple-50 text-[11px] text-gray-600 hover:text-purple-600 font-medium transition-colors border border-gray-200 hover:border-purple-200 shadow-sm">{t.refine_modes.more_realistic}</button>
                                <button onClick={() => triggerRefine('lighter')} className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-purple-50 text-[11px] text-gray-600 hover:text-purple-600 font-medium transition-colors border border-gray-200 hover:border-purple-200 shadow-sm">{t.refine_modes.lighter}</button>
                            </div>
                            <div className="relative w-full">
                                <input 
                                    type="text" 
                                    placeholder={t.refine_placeholder}
                                    value={refineInput}
                                    onChange={(e) => setRefineInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && triggerRefine('none')}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-12 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all shadow-inner"
                                />
                                <button 
                                    onClick={() => triggerRefine('none')}
                                    disabled={!refineInput.trim()}
                                    className={`absolute right-2 top-2 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                                        refineInput.trim() 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="w-[310px] h-[610px] rounded-[40px] border-[4px] border-dashed border-gray-200 flex items-center justify-center bg-gray-50/50">
                        <span className="text-gray-400 text-sm font-medium">{t.generated_placeholder}</span>
                    </div>
                )}
            </div>
            </div>
        </div>
      </div>
    
    </div>
  );
};
