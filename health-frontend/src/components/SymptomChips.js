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
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Quick-tap symptoms to describe your condition:
      </p>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((symptom) => (
          <button
            key={symptom}
            type="button"
            onClick={() => onTapChip(symptom)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-health-primary/10 dark:hover:bg-health-primary/20 hover:text-health-primary dark:hover:text-health-secondary hover:border-health-primary/30 transition active:scale-95 duration-150 shadow-sm"
          >
            + {symptom}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SymptomChips;
