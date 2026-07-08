import React, { useState, useEffect } from 'react';

const SymptomTrends = ({ language, translations }) => {
  const [logs, setLogs] = useState([]);
  const t = translations[language] || translations['en'];

  useEffect(() => {
    try {
      const savedLogs = JSON.parse(localStorage.getItem('healthcompanion_symptom_log')) || [];
      // Sort oldest to newest for chronological chart rendering
      const sorted = [...savedLogs].reverse();
      setLogs(sorted);
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  }, []);

  const handleClearLogs = () => {
    if (window.confirm(t.confirmClearTrends || "Are you sure you want to clear your trend history?")) {
      localStorage.removeItem('healthcompanion_symptom_log');
      setLogs([]);
    }
  };

  const getSeverityValue = (sev) => {
    const s = sev ? sev.toLowerCase() : '';
    if (s.includes('emergency')) return 3;
    if (s.includes('doctor')) return 2;
    return 1; // self-care or default
  };

  const getSeverityColor = (sev) => {
    const s = sev ? sev.toLowerCase() : '';
    if (s.includes('emergency')) return 'text-red-500 bg-red-100 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30';
    if (s.includes('doctor')) return 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30';
    return 'text-green-600 bg-green-100 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/30';
  };

  // Generate SVG chart path
  const width = 600;
  const height = 180;
  const padding = 30;

  const chartData = logs.map((log, index) => ({
    x: index,
    y: getSeverityValue(log.severity),
    date: new Date(log.date).toLocaleDateString(),
    cause: log.possible_causes && log.possible_causes.length > 0 ? log.possible_causes[0] : 'Symptom Triage'
  }));

  let points = '';
  let areaPoints = '';
  if (chartData.length > 0) {
    const xStep = chartData.length > 1 ? (width - padding * 2) / (chartData.length - 1) : 0;
    const yMax = 3;
    const yMin = 1;
    
    const mapY = (val) => {
      const ratio = (val - yMin) / (yMax - yMin || 1);
      return height - padding - ratio * (height - padding * 2);
    };

    chartData.forEach((d, i) => {
      const px = chartData.length > 1 ? padding + i * xStep : width / 2;
      const py = mapY(d.y);
      points += `${px},${py} `;
      if (i === 0) {
        areaPoints += `${px},${height - padding} `;
      }
      areaPoints += `${px},${py} `;
      if (i === chartData.length - 1) {
        areaPoints += `${px},${height - padding} `;
      }
    });
  }

  // Count severity stats
  const totalCount = logs.length;
  const emergencyCount = logs.filter(l => getSeverityValue(l.severity) === 3).length;
  const doctorCount = logs.filter(l => getSeverityValue(l.severity) === 2).length;
  const selfCareCount = logs.filter(l => getSeverityValue(l.severity) === 1).length;

  return (
    <div className="space-y-6">
      {/* Overview Dashboard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/40 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {t.trendsTitle || "Symptom Severity Trends"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.trendsSubtitle || "Educational summary of logged triage results"}
          </p>
        </div>
        {totalCount > 0 && (
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl transition duration-200"
          >
            {t.clearHistory || "Clear History"}
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-gray-150 dark:border-slate-800/80">
          <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {t.noHistoryTitle || "No Symptom History Yet"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
            {t.noHistoryDesc || "Start a chat conversation and submit symptoms. Resolved triage evaluations will build your trend chart."}
          </p>
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.totalTriages || "Total Triages"}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">{t.selfCare || "Self-Care"}</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{selfCareCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{t.seeDoctor || "See Doctor"}</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{doctorCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{t.emergency || "Emergency"}</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{emergencyCount}</p>
            </div>
          </div>

          {/* Interactive Chart Card */}
          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-5 rounded-2xl border border-white/30 dark:border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
              {t.severityTimeline || "Severity Timeline"}
            </h3>

            {/* Sparkline Canvas */}
            <div className="relative w-full overflow-x-auto">
              <div className="min-w-[600px] h-[200px] flex items-center justify-center p-2">
                {chartData.length === 1 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    {t.needMorePoints || "Add more logs to plot a timeline sparkline."}
                    <div className="mt-3 flex gap-2 justify-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${getSeverityColor(logs[0].severity)}`}>
                        {logs[0].severity} ({new Date(logs[0].date).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                    
                    {/* Gridlines */}
                    <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                    <text x={padding - 8} y={padding + 3} textAnchor="end" className="text-[9px] fill-red-500 font-bold">EMERGENCY</text>

                    <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                    <text x={padding - 8} y={height/2 + 3} textAnchor="end" className="text-[9px] fill-amber-500 font-bold">DOCTOR</text>

                    <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                    <text x={padding - 8} y={height-padding + 3} textAnchor="end" className="text-[9px] fill-green-500 font-bold">SELF-CARE</text>

                    {/* Area under the curve */}
                    {areaPoints && (
                      <polygon points={areaPoints} fill="url(#chart-area-grad)" />
                    )}

                    {/* Sparkline path */}
                    {points && (
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    )}

                    {/* Interactive dots */}
                    {chartData.map((d, i) => {
                      const xStep = (width - padding * 2) / (chartData.length - 1);
                      const mapY = (val) => {
                        const ratio = (val - 1) / (3 - 1);
                        return height - padding - ratio * (height - padding * 2);
                      };
                      const cx = padding + i * xStep;
                      const cy = mapY(d.y);
                      
                      return (
                        <g key={i} className="group cursor-pointer">
                          <circle
                            cx={cx}
                            cy={cy}
                            r="5"
                            className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 stroke-[2] transition-all group-hover:r-7"
                          />
                          <title>{`Date: ${d.date}\nSeverity: ${d.y === 3 ? "Emergency" : d.y === 2 ? "See Doctor" : "Self-care"}\nCause: ${d.cause}`}</title>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* History log entries */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/20">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t.recentLogs || "Recent Logs"}
              </h4>
            </div>
            <div className="divide-y divide-gray-150 dark:divide-slate-800/85">
              {logs.map((log, index) => (
                <div key={index} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(log.date).toLocaleString()}
                    </span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-1">
                      {log.possible_causes && log.possible_causes.length > 0
                        ? log.possible_causes.join(', ')
                        : 'Symptom Triage'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full self-start sm:self-center ${getSeverityColor(log.severity)}`}>
                    {log.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SymptomTrends;
