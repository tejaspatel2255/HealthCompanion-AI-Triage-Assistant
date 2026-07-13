import React from 'react';

const SeverityBadge = ({ severity, icon }) => {
  if (!severity) return null;
  
  let bgClass = "bg-health-success/10 dark:bg-health-success/20 text-health-success border-health-success/30";
  const sevLower = severity.toLowerCase();
  if (sevLower === 'doctor') {
    bgClass = "bg-health-caution/10 dark:bg-health-caution/20 text-health-caution border-health-caution/30";
  } else if (sevLower === 'emergency') {
    bgClass = "bg-health-emergency/15 dark:bg-health-emergency/25 text-health-emergency border-health-emergency/30 font-bold";
  } else if (sevLower === 'unable to analyze' || sevLower === 'error') {
    bgClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${bgClass} transition-colors duration-200`}>
      <span className="text-sm">{icon}</span>
      <span>Triage: {severity}</span>
    </span>
  );
};

export default SeverityBadge;
