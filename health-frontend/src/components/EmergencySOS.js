import React, { useState } from 'react';
import HospitalFinder from './HospitalFinder';

const EmergencySOS = ({ API_URL, language, translations }) => {
  const [emergencyNumber, setEmergencyNumber] = useState(() => {
    return localStorage.getItem('healthcompanion_sos_number') || '112';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showFinder, setShowFinder] = useState(false);

  const t = translations[language] || translations['en'];

  const handleSaveNumber = (val) => {
    const clean = val.replace(/[^\d+]/g, '');
    setEmergencyNumber(clean);
    localStorage.setItem('healthcompanion_sos_number', clean);
  };

  return (
    <div className="mt-4 p-5 bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500 rounded-2xl shadow-lg space-y-4 animate-pulse-slow">
      {/* Alert Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white animate-bounce shadow-md">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-base font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide">
            {t.emergencyAlertTitle || "CRITICAL EMERGENCY DETECTED"}
          </h4>
          <p className="text-xs text-red-650 dark:text-red-300 font-medium">
            {t.emergencyAlertSubtitle || "Immediate medical attention is recommended."}
          </p>
        </div>
      </div>

      {/* Main SOS Call Link */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-red-600/90 hover:bg-red-600 p-4 rounded-xl shadow-md transition duration-200">
        <a
          href={`tel:${emergencyNumber}`}
          className="flex-1 text-center sm:text-left text-white font-extrabold text-lg flex items-center justify-center sm:justify-start gap-2.5"
        >
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>{t.callEmergency || "CALL EMERGENCY SERVICES"} ({emergencyNumber})</span>
        </a>

        {/* SOS Number configuration input */}
        <div className="text-right text-[10px] text-red-100 flex items-center justify-center sm:justify-end gap-1.5 self-center">
          {isEditing ? (
            <input
              type="text"
              value={emergencyNumber}
              onChange={(e) => handleSaveNumber(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              autoFocus
              className="px-2 py-0.5 text-xs text-red-950 font-bold bg-white rounded border border-transparent focus:outline-none w-16 text-center"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="underline font-bold hover:text-white hover:no-underline"
              title="Change emergency dialer number"
            >
              {t.changeNumber || "Change Number"}
            </button>
          )}
        </div>
      </div>

      {/* Primary SOS Action Disclaimer */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/30 text-xs text-red-700 dark:text-red-400 font-bold leading-relaxed shadow-sm">
        🚨 <b>{t.safetyNoticeTitle || "Emergency Disclaimer:"}</b> {t.emergencyAlertDisclaimer || "If this is a real emergency, call emergency services now. Do not wait for further AI guidance."}
      </div>

      {/* Hospital Finder Secondary Accordion */}
      <div className="space-y-2">
        {!showFinder ? (
          <button
            onClick={() => setShowFinder(true)}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition"
          >
            🗺️ {t.findFacilities || "Find Nearby Hospitals & Clinics"}
          </button>
        ) : (
          <HospitalFinder
            API_URL={API_URL}
            language={language}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
};

export default EmergencySOS;
