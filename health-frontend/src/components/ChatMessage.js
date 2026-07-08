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
