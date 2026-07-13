import { jsPDF } from 'jspdf';

// Helper to aggregate structured data from the conversation history
export const compileDoctorSummaryData = (messages, language, translations) => {
  const userMessages = messages.filter(m => m.sender === 'user');
  const assistantMessages = messages.filter(m => m.sender === 'assistant');

  // 1. Extract Reported Symptoms (split by commas/chips, clean and deduplicate)
  const symptomsSet = new Set();
  userMessages.forEach(m => {
    const parts = m.text.split(/[,.]/);
    parts.forEach(p => {
      const clean = p.trim();
      if (clean && clean.length > 0 && clean.length < 50 && !clean.toLowerCase().includes("vitals")) {
        const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
        symptomsSet.add(formatted);
      }
    });
  });
  const symptoms = Array.from(symptomsSet);

  // 2. Extract Duration/Onset (scan user text for keyword phrases)
  const durationPhrases = [];
  const durationKeywords = ['day', 'hour', 'week', 'month', 'since', 'yesterday', 'ago', 'last', 'दिन', 'घंटे', 'हफ़्ता', 'महीना', 'कल', 'વિસ', 'કલાક', 'અઠવાડિયું', 'ગઈકાલ'];
  userMessages.forEach(m => {
    const text = m.text.toLowerCase();
    const hasKeyword = durationKeywords.some(kw => text.includes(kw));
    if (hasKeyword && m.text.length < 120) {
      durationPhrases.push(m.text);
    }
  });

  // 3. Aggregate Vitals (collect all unique vitals logged across messages)
  const aggregatedVitals = {
    temperature: '',
    bloodPressure: '',
    pulse: ''
  };
  userMessages.forEach(m => {
    if (m.vitals) {
      if (m.vitals.temperature) aggregatedVitals.temperature = m.vitals.temperature;
      if (m.vitals.bloodPressure) aggregatedVitals.bloodPressure = m.vitals.bloodPressure;
      if (m.vitals.pulse) aggregatedVitals.pulse = m.vitals.pulse;
    }
  });

  // 4. Aggregate AI-Flagged Possible Causes
  const causesSet = new Set();
  assistantMessages.forEach(m => {
    if (m.possible_causes) {
      m.possible_causes.forEach(c => causesSet.add(c));
    }
  });
  const possibleCauses = Array.from(causesSet);

  // 5. Aggregate Red Flags
  const redFlagsSet = new Set();
  assistantMessages.forEach(m => {
    if (m.red_flags) {
      m.red_flags.forEach(rf => redFlagsSet.add(rf));
    }
  });
  const redFlags = Array.from(redFlagsSet);

  // 6. Final/Highest Severity Level Reached
  const severityMap = {
    'clarifying': 0,
    'self-care': 1,
    'doctor': 2,
    'emergency': 3
  };
  let highestSeverity = 'self-care';
  let highestVal = 1;
  assistantMessages.forEach(m => {
    if (m.severity) {
      const sev = m.severity.toLowerCase().trim();
      const val = severityMap[sev];
      if (val !== undefined && val > highestVal) {
        highestVal = val;
        highestSeverity = sev;
      }
    }
  });

  // 7. Get recommended action from the last turn
  let finalRecommendedAction = '';
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    if (assistantMessages[i].recommended_action) {
      finalRecommendedAction = assistantMessages[i].recommended_action;
      break;
    }
  }

  return {
    symptoms,
    durationPhrases,
    vitals: aggregatedVitals,
    possibleCauses,
    redFlags,
    severity: highestSeverity,
    recommendedAction: finalRecommendedAction,
    timestamp: new Date().toLocaleString()
  };
};

export const generatePlainDoctorSummary = (summaryData, language, translations) => {
  const t = translations[language] || translations['en'];
  
  const sevLabel = {
    'self-care': t.selfCare || 'Self-Care',
    'doctor': t.seeDoctor || 'See Doctor',
    'emergency': t.emergency || 'Emergency'
  }[summaryData.severity] || summaryData.severity;

  let text = `==================================================\n`;
  text += `HEALTHCOMPANION - SUMMARY FOR HEALTHCARE PROVIDER\n`;
  text += `Generated: ${summaryData.timestamp}\n`;
  text += `==================================================\n\n`;
  
  text += `DISCLAIMER:\n`;
  text += `This is an AI-generated educational summary compiled from patient-reported\n`;
  text += `information. It is not a clinical assessment and must be verified\n`;
  text += `independently by the treating provider.\n\n`;

  text += `[SEVERITY LEVEL]\n`;
  text += `${sevLabel.toUpperCase()}\n\n`;

  text += `[REPORTED SYMPTOMS]\n`;
  if (summaryData.symptoms.length > 0) {
    summaryData.symptoms.forEach(s => {
      text += `- ${s}\n`;
    });
  } else {
    text += `None reported.\n`;
  }
  text += `\n`;

  text += `[ONSET & DURATION DETAILS]\n`;
  if (summaryData.durationPhrases.length > 0) {
    summaryData.durationPhrases.forEach(d => {
      text += `- "${d}"\n`;
    });
  } else {
    text += `No specific timeline details mentioned.\n`;
  }
  text += `\n`;

  text += `[PATIENT VITALS]\n`;
  const v = summaryData.vitals;
  if (v.temperature || v.bloodPressure || v.pulse) {
    if (v.temperature) text += `- Temperature: ${v.temperature}°F\n`;
    if (v.bloodPressure) text += `- Blood Pressure: ${v.bloodPressure}\n`;
    if (v.pulse) text += `- Pulse: ${v.pulse} BPM\n`;
  } else {
    text += `No vitals reported.\n`;
  }
  text += `\n`;

  text += `[AI-FLAGGED POSSIBLE CONCERNS]\n`;
  if (summaryData.possibleCauses.length > 0) {
    summaryData.possibleCauses.forEach(c => {
      text += `- ${c}\n`;
    });
  } else {
    text += `None listed.\n`;
  }
  text += `\n`;

  text += `[RED FLAGS RAISED]\n`;
  if (summaryData.redFlags.length > 0) {
    summaryData.redFlags.forEach(rf => {
      text += `- ${rf}\n`;
    });
  } else {
    text += `No red flags noted.\n`;
  }
  text += `\n`;

  text += `[RECOMMENDED ACTION / NEXT STEP]\n`;
  text += `${summaryData.recommendedAction || 'None specified.'}\n`;

  return text;
};

export const generateDoctorSummaryPDF = (summaryData, language, translations) => {
  const doc = new jsPDF();

  // Title Branding
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("HealthCompanion — Summary for Healthcare Provider", 20, 20);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated: ${summaryData.timestamp}`, 20, 25);

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(20, 28, 190, 28);

  // 1. Disclaimer Card at the top (Red border or slate background)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(20, 32, 170, 18, 1.5, 1.5, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text("CLINICAL DISCLAIMER FOR PROVIDER:", 23, 37);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const disclaimerLines = doc.splitTextToSize(
    "This is an AI-generated educational summary compiled from patient-reported information. It is not a clinical assessment, diagnostic verdict, or treatment plan. All reported inputs, symptoms, and vitals must be verified independently by the treating provider.",
    164
  );
  doc.text(disclaimerLines, 23, 41);

  // Left Column / Right Column Coordinates
  let yLeft = 58;
  let yRight = 58;

  // --- LEFT COLUMN ---
  // A. Vitals Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("PATIENT VITALS", 20, yLeft);
  yLeft += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, yLeft, 95, yLeft);
  yLeft += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const v = summaryData.vitals;
  if (v.temperature || v.bloodPressure || v.pulse) {
    if (v.temperature) {
      doc.text(`Temperature: ${v.temperature} °F`, 22, yLeft);
      yLeft += 5;
    }
    if (v.bloodPressure) {
      doc.text(`Blood Pressure: ${v.bloodPressure}`, 22, yLeft);
      yLeft += 5;
    }
    if (v.pulse) {
      doc.text(`Pulse Rate: ${v.pulse} BPM`, 22, yLeft);
      yLeft += 5;
    }
  } else {
    doc.setFont("Helvetica", "italic");
    doc.text("No vitals reported.", 22, yLeft);
    yLeft += 5;
  }
  yLeft += 4;

  // B. Reported Symptoms
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("REPORTED SYMPTOMS", 20, yLeft);
  yLeft += 4;
  doc.line(20, yLeft, 95, yLeft);
  yLeft += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (summaryData.symptoms.length > 0) {
    summaryData.symptoms.forEach(s => {
      const splitS = doc.splitTextToSize(`• ${s}`, 72);
      splitS.forEach(line => {
        doc.text(line, 22, yLeft);
        yLeft += 4.5;
      });
    });
  } else {
    doc.setFont("Helvetica", "italic");
    doc.text("None listed.", 22, yLeft);
    yLeft += 5;
  }
  yLeft += 4;

  // C. Timeline & Onset
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("ONSET & DURATION DETAILS", 20, yLeft);
  yLeft += 4;
  doc.line(20, yLeft, 95, yLeft);
  yLeft += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (summaryData.durationPhrases.length > 0) {
    summaryData.durationPhrases.forEach(d => {
      const splitD = doc.splitTextToSize(`"${d}"`, 72);
      splitD.forEach(line => {
        doc.text(line, 22, yLeft);
        yLeft += 4.5;
      });
      yLeft += 1.5;
    });
  } else {
    doc.setFont("Helvetica", "italic");
    doc.text("No specific duration or onset keywords mentioned.", 22, yLeft);
    yLeft += 5;
  }

  // --- RIGHT COLUMN ---
  // A. Severity Level Badge
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TRIAGE SEVERITY LEVEL", 105, yRight);
  yRight += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(105, yRight, 190, yRight);
  yRight += 5;

  let badgeText = "SELF-CARE";
  let badgeColor = [22, 163, 74]; // Green
  const sevLower = summaryData.severity.toLowerCase();
  if (sevLower === 'emergency') {
    badgeText = "EMERGENCY";
    badgeColor = [220, 38, 38]; // Red
  } else if (sevLower === 'doctor') {
    badgeText = "SEE A DOCTOR";
    badgeColor = [217, 119, 6]; // Amber
  }

  doc.setFillColor(...badgeColor);
  doc.roundedRect(105, yRight - 1, 45, 6, 1, 1, 'F');
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, 109, yRight + 3.2);
  yRight += 12;

  // B. AI-Flagged Potential Concerns
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("AI-FLAGGED CONCERNS", 105, yRight);
  yRight += 4;
  doc.line(105, yRight, 190, yRight);
  yRight += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (summaryData.possibleCauses.length > 0) {
    summaryData.possibleCauses.forEach(c => {
      const splitC = doc.splitTextToSize(`• ${c}`, 82);
      splitC.forEach(line => {
        doc.text(line, 107, yRight);
        yRight += 4.5;
      });
    });
  } else {
    doc.setFont("Helvetica", "italic");
    doc.text("None flagged.", 107, yRight);
    yRight += 5;
  }
  yRight += 4;

  // C. Red Flags (Prominent warning box)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38); // Red
  doc.text("RED FLAGS TO MONITOR", 105, yRight);
  yRight += 4;
  doc.setDrawColor(254, 202, 202); // red-200
  doc.line(105, yRight, 190, yRight);
  yRight += 5;

  if (summaryData.redFlags.length > 0) {
    const startY = yRight - 2;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    
    let boxHeight = 4;
    summaryData.redFlags.forEach(rf => {
      const lines = doc.splitTextToSize(`⚠️ ${rf}`, 80);
      boxHeight += lines.length * 4.5;
    });

    doc.setFillColor(254, 242, 242); // red-50
    doc.roundedRect(105, startY, 85, boxHeight, 1.5, 1.5, 'F');

    let textY = startY + 5;
    summaryData.redFlags.forEach(rf => {
      const lines = doc.splitTextToSize(`⚠️ ${rf}`, 80);
      lines.forEach(line => {
        doc.text(line, 108, textY);
        textY += 4.5;
      });
    });
    yRight = startY + boxHeight + 6;
  } else {
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No red flags raised.", 107, yRight);
    yRight += 6;
  }
  yRight += 2;

  // D. Recommended Next Step
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("RECOMMENDED NEXT STEP", 105, yRight);
  yRight += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(105, yRight, 190, yRight);
  yRight += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const splitRec = doc.splitTextToSize(summaryData.recommendedAction || "None specified.", 82);
  splitRec.forEach(line => {
    doc.text(line, 107, yRight);
    yRight += 4.5;
  });

  // Footer Disclaimer
  const bottomY = Math.max(yLeft, yRight) + 15;
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const footerDisclaimer = "This record serves as educational documentation. Independent validation is mandatory before formulating diagnostic or therapeutic plans. Powered by HealthCompanion.";
  doc.text(footerDisclaimer, 20, Math.min(bottomY, 285));

  const fileName = `HealthCompanion_Doctor_Handoff_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
