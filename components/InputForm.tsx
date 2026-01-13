
import React, { ChangeEvent, useRef, useState, useEffect } from 'react';
import { UserRequest } from '../types';
import { translations } from '../locales';

interface InputFormProps {
  request: UserRequest;
  onChange: (newRequest: UserRequest) => void;
  onSubmit: () => void;
  onReset: () => void;
  isLoading: boolean;
  hasResult: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ request, onChange, onSubmit, onReset, isLoading, hasResult }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const lang = request.language || 'en';
  const t = translations[lang];

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Update preview URLs whenever request.images changes
  useEffect(() => {
    const newUrls = request.images.map(file => URL.createObjectURL(file));
    setPreviewUrls(newUrls);
    
    // Cleanup old URLs on next effect run
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [request.images]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...request, raw_text: e.target.value });
  };

  const handleSelectChange = (key: keyof UserRequest, value: any) => {
    onChange({ ...request, [key]: value });
  };

  const handleAdvancedToggle = (checked: boolean) => {
    onChange({
        ...request,
        enable_l4_loop: checked,
        performance_mode: checked ? 'quality' : 'fast'
    });
  };

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    onChange({ ...request, language: newLang });
  };

  // --- Image Handling Logic ---

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
    const combinedFiles = [...request.images, ...validFiles].slice(0, 9); // Max 9 images
    onChange({ ...request, images: combinedFiles });
  };

  const removeImage = (index: number) => {
    const newImages = [...request.images];
    newImages.splice(index, 1);
    onChange({ ...request, images: newImages });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearAll = () => {
    if (confirm(t.confirm_clear)) {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onReset();
    }
  };

  // --- SVGs ---
  const iconUpload = (
    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const iconWechat = (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
       <path d="M8.5,13.5c-4.5,0-8.5-3.5-8.5-7.5s4-7.5,8.5-7.5,8.5,3.5,8.5,7.5-4,7.5-8.5,7.5Zm5.5,1.5c4,0,7.5,3,7.5,6.5s-3.5,6.5-7.5,6.5-7.5-3-7.5-6.5,3.5-6.5,7.5-6.5Z" opacity="0.8"/>
    </svg>
  );

  const iconXHS = (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19,0H5C2.2,0,0,2.2,0,5v14c0,2.8,2.2,5,5,5h14c2.8,0,5-2.2,5-5V5C24,2.2,21.8,0,19,0z M19,17h-2.5 c-0.8,0-1.5-0.7-1.5-1.5v-1c0-0.3-0.2-0.5-0.5-0.5h-5c-0.3,0-0.5,0.2-0.5,0.5v1c0,0.8-0.7,1.5-1.5,1.5H5v-2.5 c0-0.8,0.7-1.5,1.5-1.5h1c0.3,0,0.5-0.2,0.5-0.5v-5c0-0.3-0.2-0.5-0.5-0.5h-1C5.7,7,5,6.3,5,5.5V3h2.5C8.3,3,9,3.7,9,4.5v1 c0,0.3,0.2,0.5,0.5,0.5h5C14.8,6,15,5.8,15,5.5v-1C15,3.7,15.7,3,16.5,3H19v2.5c0,0.8-0.7,1.5-1.5,1.5h-1c-0.3,0-0.5,0.2-0.5,0.5 v5c0,0.3,0.2,0.5,0.5,0.5h1c0.8,0,1.5,0.7,1.5,1.5V17z"/>
    </svg>
  );

  const iconReset = (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
  );

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6 h-full overflow-y-auto">
      <header className="flex justify-between items-start">
        <div>
           <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">AmplifyMe</h2>
           <p className="text-xs text-gray-400 mt-1 tracking-wide">{t.slogan}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <button onClick={toggleLanguage} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors">
                {lang === 'en' ? '中' : 'EN'}
            </button>
            {(request.raw_text || request.images.length > 0 || hasResult) && (
                <button 
                    onClick={clearAll} 
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-500 hover:shadow-sm transition-all"
                    title={t.clear_all}
                >
                    {iconReset}
                    {t.clear_all}
                </button>
            )}
        </div>
      </header>

      {/* 1. Image Upload Area */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            {t.step_1}
            <span className="text-[10px] font-normal text-gray-400 px-2 py-0.5 bg-gray-50 rounded-full">{t.step_1_sub}</span>
        </label>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
        />
        
        {previewUrls.length === 0 ? (
          <div 
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={triggerFileUpload}
            className="border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-purple-50 hover:border-purple-200 transition-all cursor-pointer min-h-[140px] group"
          >
            <div className="group-hover:scale-110 transition-transform duration-300">{iconUpload}</div>
            <span className="text-xs text-gray-400 mt-2">{t.drag_drop}</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 animate-fade-in">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-100 bg-gray-50">
                <img src={url} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            ))}
            {request.images.length < 9 && (
              <div 
                onClick={triggerFileUpload}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition-all text-gray-300 hover:text-purple-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Text Input */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">{t.step_2}</label>
        <textarea
          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all resize-none text-gray-700 bg-gray-50/50 focus:bg-white outline-none text-sm leading-relaxed"
          rows={3}
          placeholder={t.placeholder}
          value={request.raw_text}
          onChange={handleTextChange}
        />
      </div>

      {/* 3. Selections */}
      <div className="space-y-4">
        {/* Mood */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">{t.step_3}</label>
          <div className="flex flex-wrap gap-2">
            {[
                {k:'happy', l:t.moods.happy}, 
                {k:'tired', l:t.moods.tired}, 
                {k:'sad', l:t.moods.sad}, 
                {k:'calm', l:t.moods.calm},
                {k:'proud', l:t.moods.proud}
            ].map((m) => (
              <button
                key={m.k}
                onClick={() => handleSelectChange('mood_user', m.k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  request.mood_user === m.k
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>

        {/* Intent */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">{t.step_4}</label>
          <div className="flex flex-wrap gap-2">
            {[
                {k:'just_record', l:t.intents.just_record}, 
                {k:'show_off', l:t.intents.show_off}, 
                {k:'seek_empathy', l:t.intents.seek_empathy}, 
                {k:'vent', l:t.intents.vent}
            ].map((m) => (
              <button
                key={m.k}
                onClick={() => handleSelectChange('intent_user', m.k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  request.intent_user === m.k
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">{t.step_5}</label>
          <div className="flex gap-3">
            <label className={`flex-1 p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${request.platform === 'wechat_moments' ? 'border-green-500 bg-green-50/50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="platform" 
                className="hidden" 
                checked={request.platform === 'wechat_moments'} 
                onChange={() => handleSelectChange('platform', 'wechat_moments')}
              />
              <span className={request.platform === 'wechat_moments' ? 'text-green-600' : 'text-gray-400'}>{iconWechat}</span>
              <span className="text-xs font-medium">{t.platforms.wechat}</span>
            </label>
            <label className={`flex-1 p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${request.platform === 'xiaohongshu' ? 'border-red-500 bg-red-50/50 text-red-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="platform" 
                className="hidden" 
                checked={request.platform === 'xiaohongshu'} 
                onChange={() => handleSelectChange('platform', 'xiaohongshu')}
              />
              <span className={request.platform === 'xiaohongshu' ? 'text-red-600' : 'text-gray-400'}>{iconXHS}</span>
              <span className="text-xs font-medium">{t.platforms.xhs}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Optimization Switch */}
      <div className="pt-2 border-t border-gray-50 mt-2">
         <label className="flex items-center justify-between cursor-pointer group select-none">
            <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                   {t.advanced_opt}
                   <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-600 font-medium">{t.advanced_sub}</span>
                </span>
                <span className="text-[10px] text-gray-400 group-hover:text-purple-400 transition-colors">
                    {t.advanced_desc}
                </span>
            </div>
            <div className="relative">
                <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={request.enable_l4_loop || false}
                    onChange={(e) => handleAdvancedToggle(e.target.checked)}
                />
                <div className={`w-10 h-6 rounded-full shadow-inner transition-colors duration-300 ${request.enable_l4_loop ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${request.enable_l4_loop ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
         </label>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onSubmit}
          disabled={isLoading || (!request.raw_text && request.images.length === 0)}
          className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
            isLoading || (!request.raw_text && request.images.length === 0)
              ? 'bg-gray-300 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-200/50 hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{t.loading_text}</span>
            </>
          ) : (
            <span>{t.submit_btn}</span>
          )}
        </button>
      </div>
    </div>
  );
};
