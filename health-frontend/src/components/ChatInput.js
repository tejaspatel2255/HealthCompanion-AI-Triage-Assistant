import React from 'react';
import VoiceButton from './VoiceButton';

const ChatInput = ({
  input,
  setInput,
  image,
  setImage,
  vitals,
  setVitals,
  isVitalsOpen,
  setIsVitalsOpen,
  isLoading,
  language,
  translations,
  handleSend,
  handleImageUpload,
  handleTranscript,
}) => {
  const t = translations[language] || translations['en'];

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(e);
  };

  return (
    <div className="w-full flex flex-col min-h-0 bg-white/95 dark:bg-slate-900/95 shrink-0">
      {/* Collapsible Vitals Panel */}
      <div className="w-full border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setIsVitalsOpen(!isVitalsOpen)}
          className="flex items-center gap-1.5 text-xs font-bold text-health-primary dark:text-health-secondary hover:underline transition"
        >
          <span>{isVitalsOpen ? "▼" : "▶"} {t.vitalsSubtitle || "Add vitals (optional)"}</span>
        </button>
        {isVitalsOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.temperature}
              </label>
              <input
                type="text"
                value={vitals.temperature}
                onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                placeholder={t.tempPlaceholder}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-105 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent transition font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.bloodPressure}
              </label>
              <input
                type="text"
                value={vitals.bloodPressure}
                onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                placeholder={t.bpPlaceholder}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-105 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent transition font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.pulse}
              </label>
              <input
                type="text"
                value={vitals.pulse}
                onChange={(e) => setVitals(prev => ({ ...prev, pulse: e.target.value }))}
                placeholder={t.pulsePlaceholder}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-105 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent transition font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Image Thumbnail Preview Block */}
      {image && (
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 relative w-full">
            <div className="relative flex-shrink-0">
              <img
                src={image}
                alt="Symptom preview"
                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-health-emergency hover:bg-health-emergency/90 text-white rounded-full p-0.5 text-[9px] shadow-sm w-4 h-4 flex items-center justify-center font-bold"
                title="Remove image"
              >
                ✕
              </button>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-normal pr-4">
              {t.imageDisclaimer}
            </span>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-150 dark:border-slate-800 p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
        <VoiceButton 
          onTranscript={handleTranscript}
          disabled={isLoading}
          language={language}
        />

        {/* Image Upload Button */}
        <label 
          className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-750 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl cursor-pointer transition flex items-center justify-center flex-shrink-0 min-h-[40px] w-[40px]" 
          title="Upload diagnostic photo (JPG/PNG)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isLoading}
          />
        </label>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={t.inputPlaceholder}
          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent text-sm transition min-h-[40px]"
        />

        <button
          type="submit"
          disabled={(!input.trim() && !image) || isLoading}
          className="p-2 sm:p-3 bg-health-primary hover:bg-health-primary/95 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 min-h-[40px] w-[40px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
