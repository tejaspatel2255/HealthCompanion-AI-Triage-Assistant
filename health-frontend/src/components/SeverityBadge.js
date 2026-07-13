import React from 'react';

const SeverityBadge = ({ severity, icon }) => {
  if (!severity) return null;
  
  let bgClass = "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
  const sevLower = severity.toLowerCase();
  if (sevLower === 'doctor') {
    bgClass = "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
  } else if (sevLower === 'emergency') {
    bgClass = "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
  } else if (sevLower === 'unable to analyze' || sevLower === 'error') {
    bgClass = "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-slate-700";
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bgClass}`}>
      <span className="text-sm">{icon}</span>
      <span>Triage: {severity}</span>
    </span>
  );
};

export default SeverityBadge;
