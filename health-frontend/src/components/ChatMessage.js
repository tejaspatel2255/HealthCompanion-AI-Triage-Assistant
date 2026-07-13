import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge';
import HospitalFinder from './HospitalFinder';
import EmergencySOS from './EmergencySOS';

const ChatMessage = ({ message, API_URL, language, translations }) => {
  const isUser = message.sender === 'user';
  const [showFinder, setShowFinder] = useState(false);
  const t = translations[language] || translations['en'];
  
  const showSeverity = 
    !isUser && 
    message.severity && 
    message.severity.toLowerCase() !== 'clarifying' && 
    message.severity.toLowerCase() !== 'error';

  const showHospitalFinderBtn = 
    !isUser && 
    message.severity && 
    message.severity.toLowerCase() === 'doctor';

  const showSOSPanel = 
    !isUser && 
    message.severity && 
    message.severity.toLowerCase() === 'emergency';

  const isImageAnalysis = !isUser && message.image;

  if (isImageAnalysis) {
    return (
      <div className="flex w-full my-4 justify-start">
        <div className="w-full max-w-[90%] md:max-w-[80%] rounded-2xl p-5 bg-gradient-to-br from-blue-50/60 to-white dark:from-slate-800/40 dark:to-slate-900 border border-blue-100/80 dark:border-slate-800 shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 flex-shrink-0">
                <img
                  src={message.image}
                  alt="Analyzed symptom"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">HealthCompanion</span>
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    📸 {language === 'hi' ? 'छवि विश्लेषण' : language === 'gu' ? 'છબી વિશ્લેષણ' : 'Image Analysis'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">AI Triage Assistant</p>
              </div>
            </div>
            {/* Severity Badge at Top Right */}
            {showSeverity && (
              <SeverityBadge severity={message.severity} icon={message.icon} />
            )}
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-gray-850 dark:text-gray-200">
            {/* Visual Observations */}
            <div className="space-y-1">
              <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                🔍 {language === 'hi' ? 'अवलोकन' : language === 'gu' ? 'અવલોકન' : 'What I Observe'}
              </h5>
              <p className="text-sm leading-relaxed whitespace-pre-wrap pl-1 text-gray-700 dark:text-gray-300">{message.text}</p>
            </div>

            {/* Potential Causes */}
            {message.possible_causes && message.possible_causes.length > 0 && (
              <div className="space-y-1 bg-gray-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-gray-100 dark:border-slate-850">
                <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  🩺 {language === 'hi' ? 'संभवित कारण' : language === 'gu' ? 'સંભવિત કારણો' : 'Potential Causes'}
                </h5>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {message.possible_causes.map((cause, idx) => (
                    <li key={idx} className="leading-relaxed">{cause}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {message.red_flags && message.red_flags.length > 0 && (
              <div className="space-y-1 bg-red-50/30 dark:bg-red-955/10 p-3 rounded-xl border border-red-100/50 dark:border-red-950/30">
                <h5 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  🚨 {language === 'hi' ? 'चेतावनी संकेत' : language === 'gu' ? 'ચેતવણી ચિહ્નો' : 'Red Flags to Watch For'}
                </h5>
                <ul className="list-disc pl-5 space-y-1 text-sm text-red-700 dark:text-red-300">
                  {message.red_flags.map((flag, idx) => (
                    <li key={idx} className="leading-relaxed font-semibold text-red-700 dark:text-red-300">{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Action */}
            {message.recommended_action && (
              <div className="pt-2 border-t border-gray-150 dark:border-slate-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{language === 'hi' ? 'अनुशंसित कार्रवाई' : language === 'gu' ? 'ભલામણ કરેલ પગલાં' : 'Recommended Action'}:</span>{' '}
                  <span className="italic">{message.recommended_action}</span>
                </p>
              </div>
            )}

            {/* Emergency SOS High-Alert Panel inside result card if severity is emergency */}
            {showSOSPanel && (
              <EmergencySOS
                API_URL={API_URL}
                language={language}
                translations={translations}
              />
            )}

            {/* Hospital Finder Secondary Accordion inside result card if severity is doctor */}
            {showHospitalFinderBtn && (
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 space-y-2">
                {!showFinder ? (
                  <button
                    onClick={() => setShowFinder(true)}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-red-400 font-bold text-xs rounded-lg transition"
                  >
                    🏥 {t.findFacilities || "Find Nearby Hospitals & Clinics"}
                  </button>
                ) : (
                  <HospitalFinder
                    API_URL={API_URL}
                    language={language}
                    translations={translations}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none'
            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-tl-none'
        }`}
      >
        {/* Render User Uploaded Image Preview */}
        {isUser && message.image && (
          <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-sm max-w-[200px]">
            <img
              src={message.image}
              alt="Uploaded symptom"
              className="w-full h-auto object-cover max-h-[160px]"
            />
          </div>
        )}

        {/* Main Reply Text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        
        {/* Potential Causes (only for Assistant) */}
        {!isUser && message.possible_causes && message.possible_causes.length > 0 && (
          <div className="mt-3 text-xs bg-gray-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800/80">
            <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">{t.potentialCauses || "Potential Causes:"}</p>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-700 dark:text-gray-300">
              {message.possible_causes.map((cause, idx) => (
                <li key={idx}>{cause}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags to Monitor (only for Assistant) */}
        {!isUser && message.red_flags && message.red_flags.length > 0 && (
          <div className="mt-3 text-xs bg-red-50/50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
            <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{t.redFlagsTitle || "Red Flags to Watch For:"}</p>
            <ul className="list-disc pl-4 space-y-0.5 text-red-700 dark:text-red-300">
              {message.red_flags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Action (only for Assistant) */}
        {!isUser && message.recommended_action && (
          <p className="mt-2.5 text-xs italic text-gray-500 dark:text-gray-400">
            {t.recommendedActionLabel || "Recommended Action:"} {message.recommended_action}
          </p>
        )}

        {/* Severity Badge */}
        {showSeverity && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 flex justify-start">
            <SeverityBadge severity={message.severity} icon={message.icon} />
          </div>
        )}

        {/* Doctor Hospital Finder Button */}
        {showHospitalFinderBtn && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 space-y-2">
            {!showFinder ? (
              <button
                onClick={() => setShowFinder(true)}
                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-red-400 font-bold text-xs rounded-lg transition"
              >
                🏥 {t.findFacilities || "Find Nearby Hospitals & Clinics"}
              </button>
            ) : (
              <HospitalFinder
                API_URL={API_URL}
                language={language}
                translations={translations}
              />
            )}
          </div>
        )}

        {/* Emergency SOS High-Alert Panel */}
        {showSOSPanel && (
          <EmergencySOS
            API_URL={API_URL}
            language={language}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
