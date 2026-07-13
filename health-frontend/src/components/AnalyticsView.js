import React, { useState, useEffect } from 'react';

export default function AnalyticsView({ language, translations }) {
  const t = translations[language] || translations['en'];
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default demo passcode
  const DEMO_PASSCODE = 'admin123';

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcode === DEMO_PASSCODE) {
      setIsAuthenticated(true);
      setPasscodeError('');
    } else {
      setPasscodeError(language === 'hi' ? 'अमान्य पासकोड। कृपया पुनः प्रयास करें।' : language === 'gu' ? 'અમાન્ય પાસકોડ. કૃપા કરીને ફરી પ્રયાસ કરો.' : 'Invalid passcode. Please try again.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/analytics/summary`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics summary');
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, API_URL]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[40vh] text-center">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-xl mb-4">
          🔐
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
          {language === 'hi' ? 'एनालिटिक्स एक्सेस गेट' : language === 'gu' ? 'એનાલિટિક્સ એક્સેસ ગેટ' : 'Analytics Access Gate'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
          {language === 'hi' 
            ? 'सुरक्षित व्यवस्थापक डैशबोर्ड देखने के लिए कृपया पासकोड दर्ज करें।' 
            : language === 'gu' 
            ? 'સુરક્ષિત એડમિન ડેશબોર્ડ જોવા માટે કૃપા કરીને પાસકોડ દાખલ કરો.' 
            : 'Please enter the passcode to view the secure admin dashboard.'}
        </p>

        <form onSubmit={handleVerifyPasscode} className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="e.g. admin123"
            className="w-full px-3.5 py-2 text-center text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-350 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {passcodeError && (
            <p className="text-[10px] text-red-500 font-semibold">{passcodeError}</p>
          )}
          <button
            type="submit"
            className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-750 rounded-xl transition shadow-sm"
          >
            {language === 'hi' ? 'सत्यापित करें' : language === 'gu' ? 'ચકાસો' : 'Verify Access'}
          </button>
        </form>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4">
          Demo passcode: <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{DEMO_PASSCODE}</code>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading aggregate analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[40vh]">
        <span className="text-2xl mb-2">⚠️</span>
        <h4 className="text-sm font-bold text-red-500">Failed to load analytics</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  // Find most common severity
  const severityDist = data?.severity_distribution || [];
  let mostCommonSev = 'N/A';
  let maxCount = -1;
  severityDist.forEach(item => {
    if (item.count > maxCount) {
      maxCount = item.count;
      mostCommonSev = item.severity;
    }
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📊</span>
          {language === 'hi' ? 'अनाम स्वास्थ्य विश्लेषिकी' : language === 'gu' ? 'અનામી આરોગ્ય વિશ્લેષણ' : 'Anonymized Health Analytics'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === 'hi' 
            ? 'स्वास्थ्य साथी प्रणाली में सक्रिय रिपोर्टों का लाइव सुरक्षित दृश्य।' 
            : language === 'gu' 
            ? 'હેલ્થ સાથી સિસ્ટમમાં સક્રિય અહેવાલોનું લાઈવ સુરક્ષિત દૃશ્ય.' 
            : 'Live aggregate statistics of reported triages across the platform.'}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold block mb-1">
            Total Conversations
          </span>
          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {data?.total_conversations}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold block mb-1">
            Common Severity
          </span>
          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {mostCommonSev}
          </span>
        </div>
      </div>

      {/* Severity distribution bar progress rows */}
      <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
          Severity Case Distribution
        </h3>
        <div className="space-y-3.5">
          {severityDist.map(item => {
            let barColor = 'bg-green-500';
            if (item.severity.toLowerCase() === 'doctor') barColor = 'bg-amber-500';
            if (item.severity.toLowerCase() === 'emergency') barColor = 'bg-red-500';

            return (
              <div key={item.severity}>
                <div className="flex justify-between items-center text-xs text-slate-650 dark:text-slate-350 mb-1">
                  <span className="font-semibold">{item.severity}</span>
                  <span className="font-bold">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Symptoms list / bar chart */}
      <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
          Most Common Reported Symptoms
        </h3>
        
        {data?.symptom_counts && data.symptom_counts.length > 0 ? (
          <div className="space-y-3">
            {data.symptom_counts.map((symptom) => {
              const maxSymptomCount = Math.max(...data.symptom_counts.map(s => s.count), 1);
              const percent = Math.round((symptom.count / maxSymptomCount) * 100);

              return (
                <div key={symptom.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-24 truncate" title={symptom.name}>
                    {symptom.name}
                  </span>
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-3 rounded-md overflow-hidden relative">
                    <div className="h-full bg-indigo-500/85 dark:bg-indigo-650/85 rounded-md transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                    {symptom.count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4">
            No symptoms logged in the past 30 days yet.
          </p>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50/45 dark:bg-blue-955/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-3.5 flex items-start gap-2.5">
        <span className="text-sm">🛡️</span>
        <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
          <strong>Privacy Note:</strong> All data shown here is aggregated and anonymized. No individual conversations or personal information are displayed.
        </p>
      </div>
    </div>
  );
}
