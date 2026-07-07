import React from 'react';

const SYMPTOMS = [
  "Fever",
  "Cough",
  "Headache",
  "Fatigue",
  "Nausea",
  "Chest Pain",
  "Shortness of Breath",
  "Dizziness",
  "Sore Throat",
  "Body Ache"
];

const SymptomChips = ({ onTapChip }) => {
  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        Quick-tap symptoms to describe your condition:
      </p>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((symptom) => (
          <button
            key={symptom}
            type="button"
            onClick={() => onTapChip(symptom)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition active:scale-95 duration-150"
          >
            + {symptom}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SymptomChips;
