import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import VoiceButton from './components/VoiceButton';
import SymptomChips from './components/SymptomChips';
import SymptomTrends from './components/SymptomTrends';
import { speakText } from './utils/speech';
import { jsPDF } from 'jspdf';
import { compileDoctorSummaryData, generatePlainDoctorSummary, generateDoctorSummaryPDF } from './utils/doctorSummary';
import { supabase } from './utils/supabaseClient';
import AuthScreen from './components/AuthScreen';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TRANSLATIONS = {
  en: {
    appTitle: "HealthCompanion",
    appSubtitle: "Educational Triage Assistant",
    onlineStatus: "AI Triage Online",
    chatTab: "Chat",
    trendsTab: "Trends",
    quickSymptoms: "Quick Symptoms",
    reportedVitals: "Reported Vitals",
    temperature: "Temp (°F)",
    bloodPressure: "BP (Systolic/Diastolic)",
    pulse: "Pulse (BPM)",
    tempPlaceholder: "e.g. 98.6",
    bpPlaceholder: "e.g. 120/80",
    pulsePlaceholder: "e.g. 72",
    vitalsTitle: "Patient Vitals (Optional)",
    vitalsSubtitle: "Add vitals (optional)",
    inputPlaceholder: "Describe symptoms or upload photo...",
    pdfButton: "PDF",
    pdfTitle: "Download conversation as PDF",
    clearButton: "Clear",
    clearChatTitle: "Clear conversation history",
    trendsTitle: "Symptom Severity Trends",
    trendsSubtitle: "Educational summary of logged triage results",
    clearHistory: "Clear History",
    totalTriages: "Total Triages",
    selfCare: "Self-Care",
    seeDoctor: "See Doctor",
    emergency: "Emergency",
    severityTimeline: "Severity Timeline",
    needMorePoints: "Add more logs to plot a timeline sparkline.",
    recentLogs: "Recent Logs",
    noHistoryTitle: "No Symptom History Yet",
    noHistoryDesc: "Start a chat conversation and submit symptoms. Resolved triage evaluations will build your trend chart.",
    confirmClearTrends: "Are you sure you want to clear your trend history?",
    hospitalFinderTitle: "Local Medical Facilities Finder",
    hospitalFinderDesc: "Need immediate care? We can check publicly available OpenStreetMap data for nearby hospitals and clinics based on your device location.",
    findFacilities: "Find Nearby Hospitals & Clinics",
    locating: "Locating...",
    searchingFacilities: "Searching Overpass registry...",
    noFacilitiesFound: "No clinics or hospitals found within 5km of your location.",
    navigate: "Directions",
    safetyNoticeTitle: "Emergency Disclaimer:",
    safetyNoticeDesc: "This tool uses crowd-sourced Map data and is not an active emergency registry. If you are experiencing a life-threatening crisis, please CALL your emergency services (e.g. 911 / 112) directly instead of looking for directions.",
    vitalsSubmitted: "Vitals submitted successfully.",
    aiSpeaking: "Reading response aloud...",
    loadingText: "Triage analysis in progress...",
    clearConfirm: "Are you sure you want to clear this conversation?",
    homeTitle: "Your AI Health Companion",
    homeDesc: "Describe your symptoms or ask medical questions. You can type, use the microphone, or upload a symptom photo (e.g., of a skin rash or minor wound).",
    homeSuggestion1: "I have a dull headache and a slight fever",
    homeSuggestion1Label: "\"I have a dull headache and fever\"",
    homeSuggestion2: "My chest feels tight and I'm short of breath",
    homeSuggestion2Label: "\"Tight chest & short of breath\"",
    disclaimer: "Disclaimer: HealthCompanion is strictly an educational tool. It does not provide medical diagnoses, treatment advice, or prescriptions. Always consult a licensed healthcare professional for any health concerns or before making medical decisions. If you are facing an emergency, contact your local emergency services (911/112) immediately.",
    pdfHeading: "HealthCompanion — Conversation Summary",
    pdfGenerated: "Generated:",
    pdfPage: "Page",
    potentialCauses: "Potential Causes:",
    redFlagsTitle: "Red Flags to Watch For:",
    recommendedActionLabel: "Recommended Action:",
    
    // Vision and Emergency additions
    imageDisclaimer: "Image analysis is for general guidance only — not a medical diagnosis. A rash or injury photo cannot replace an in-person examination.",
    invalidFormat: "Invalid file format. Please upload a JPG or PNG image.",
    imageTooLarge: "Image size exceeds the 5MB limit. Please upload a smaller image.",
    emergencyAlertTitle: "CRITICAL EMERGENCY DETECTED",
    emergencyAlertSubtitle: "Immediate medical attention is recommended.",
    callEmergency: "CALL EMERGENCY SERVICES",
    changeNumber: "Change Number",
    emergencyAlertDisclaimer: "If this is a real emergency, call emergency services now. Do not wait for further AI guidance.",

    // Doctor Handoff additions
    doctorSummaryBtn: "Doctor Summary",
    doctorSummaryTitle: "Generate a structured report for your doctor",
    copySummaryBtn: "Copy Text",
    copySummaryTitle: "Copy doctor summary to clipboard for patient portal pasting",
    copiedSuccess: "Doctor summary copied to clipboard successfully!"
  },
  hi: {
    appTitle: "हेल्थकंपैनियन",
    appSubtitle: "शैक्षिक ट्राइएज सहायक",
    onlineStatus: "एआई ट्राइएज ऑनलाइन",
    chatTab: "चैट",
    trendsTab: "प्रवृत्तियां",
    quickSymptoms: "त्वरित लक्षण",
    reportedVitals: "रिपोर्ट किए गए वाइटल्स",
    temperature: "तापमान (°F)",
    bloodPressure: "रक्तचाप (सिस्टोलिक/डायस्टोलिक)",
    pulse: "नाड़ी (BPM)",
    tempPlaceholder: "उदा. 98.6",
    bpPlaceholder: "उदा. 120/80",
    pulsePlaceholder: "उदा. 72",
    vitalsTitle: "रोगी वाइटल्स (वैकल्पिक)",
    vitalsSubtitle: "वाइटल्स जोड़ें (वैकल्पिक)",
    inputPlaceholder: "लक्षणों का वर्णन करें या फोटो अपलोड करें...",
    pdfButton: "पीडीएफ",
    pdfTitle: "बातचीत को पीडीएफ के रूप में डाउनलोड करें",
    clearButton: "साफ़ करें",
    clearChatTitle: "बातचीत का इतिहास साफ़ करें",
    trendsTitle: "लक्षणों की गंभीरता की प्रवृत्ति",
    trendsSubtitle: "लॉग इन किए गए ट्राइएज परिणामों का शैक्षिक सारांश",
    clearHistory: "इतिहास साफ़ करें",
    totalTriages: "कुल ट्राइएज",
    selfCare: "स्वयं की देखभाल",
    seeDoctor: "डॉक्टर से मिलें",
    emergency: "आपातकालीन",
    severityTimeline: "गंभीरता समयरेखा",
    needMorePoints: "समयरेखा स्पार्कलाइन बनाने के लिए अधिक लॉग जोड़ें।",
    recentLogs: "हाल के लॉग",
    noHistoryTitle: "अभी तक कोई लक्षण इतिहास नहीं है",
    noHistoryDesc: "चैट शुरू करें और लक्षण सबमिट करें। सुलझाए गए ट्राइएज मूल्यांकन आपका प्रवृत्ति चार्ट बनाएंगे।",
    confirmClearTrends: "क्या आप वाकई अपना प्रवृत्ति इतिहास साफ़ करना चाहते हैं?",
    hospitalFinderTitle: "स्थानीय चिकित्सा सुविधा खोजक",
    hospitalFinderDesc: "त्वरित देखभाल की आवश्यकता है? हम आपके डिवाइस स्थान के आधार पर आसपास के अस्पतालों और क्लीनिकों के लिए सार्वजनिक रूप से उपलब्ध ओपनस्ट्रीटमैप डेटा की जांच कर सकते हैं।",
    findFacilities: "आसपास के अस्पताल और क्लीनिक खोजें",
    locating: "स्थान खोजा जा रहा है...",
    searchingFacilities: "ओवरपास रजिस्ट्री में खोजा जा रहा है...",
    noFacilitiesFound: "आपके स्थान के 5 किमी के भीतर कोई क्लिनिक या अस्पताल नहीं मिला।",
    navigate: "दिशा-निर्देश",
    safetyNoticeTitle: "आपातकालीन अस्वीकरण:",
    safetyNoticeDesc: "यह उपकरण क्राउड-सोर्स मैप डेटा का उपयोग करता है और यह कोई सक्रिय आपातकालीन रजिस्ट्री नहीं है। यदि आप जीवन-धमकाने वाले संकट का अनुभव कर रहे हैं, तो कृपया निर्देश खोजने के बजाय सीधे अपनी आपातकालीन सेवाओं (जैसे 108 / 112) को कॉल करें।",
    vitalsSubmitted: "वाइटल्स सफलतापूर्वक सबमिट हो गए।",
    aiSpeaking: "प्रतिक्रिया जोर से पढ़ रहे हैं...",
    loadingText: "ट्राइएज विश्लेषण चल रहा है...",
    clearConfirm: "क्या आप वाकई इस बातचीत को मिटाना चाहते हैं?",
    homeTitle: "आपका एआई स्वास्थ्य साथी",
    homeDesc: "अपने लक्षणों का वर्णन करें या चिकित्सा संबंधी प्रश्न पूछें। आप अपनी चिंताओं को टाइप कर सकते हैं, माइक्रोफ़ोन बटन का उपयोग कर सकते हैं, या लक्षण का फोटो अपलोड कर सकते हैं (उदा. त्वचा पर लाल चकत्ते या हल्की चोट)।",
    homeSuggestion1: "मुझे हल्का सिरदर्द और थोड़ा बुखार है",
    homeSuggestion1Label: "\"मुझे हल्का सिरदर्द और बुखार है\"",
    homeSuggestion2: "मेरी छाती में जकड़न महसूस हो रही है और मेरी सांस फूल रही है",
    homeSuggestion2Label: "\"छाती में जकड़न और सांस फूलना\"",
    disclaimer: "अस्वीकरण: हेल्थकंपैनियन पूरी तरह से एक शैक्षिक उपकरण है। यह चिकित्सा निदान, उपचार सलाह या नुस्खे प्रदान नहीं करता है। किसी भी स्वास्थ्य चिंता के लिए या चिकित्सा निर्णय लेने से पहले हमेशा एक लाइसेंस प्राप्त स्वास्थ्य देखभाल पेशेवर से परामर्श लें। यदि आप आपातकाल का सामना कर रहे हैं, तो तुरंत अपने स्थानीय आपातकालीन सेवाओं (108/112) से संपर्क करें।",
    pdfHeading: "हेल्थकंपैनियन — बातचीत का सारांश",
    pdfGenerated: "उत्पन्न तिथि:",
    pdfPage: "पृष्ठ",
    potentialCauses: "संभावित कारण:",
    redFlagsTitle: "चेतावनी के लक्षण जिन पर ध्यान दें:",
    recommendedActionLabel: "अनुशंसित कार्रवाई:",

    // Vision and Emergency additions
    imageDisclaimer: "छवि विश्लेषण केवल सामान्य मार्गदर्शन के लिए है - कोई चिकित्सा निदान नहीं है। दाने या चोट की तस्वीर इन-पर्सन परीक्षा की जगह नहीं ले सकती।",
    invalidFormat: "अमान्य फ़ाइल प्रारूप। कृपया एक जेपीजी या पीएनजी छवि अपलोड करें।",
    imageTooLarge: "छवि का आकार 5MB की सीमा से अधिक है। कृपया एक छोटी छवि अपलोड करें।",
    emergencyAlertTitle: "गंभीर आपातकाल का पता चला",
    emergencyAlertSubtitle: "तत्काल चिकित्सा सहायता की सिफारिश की जाती. है।",
    callEmergency: "आपातकालीन सेवाओं को कॉल करें",
    changeNumber: "नंबर बदलें",
    emergencyAlertDisclaimer: "यदि यह एक वास्तविक आपातकाल है, तो अभी आपातकालीन सेवाओं को कॉल करें। आगे के एआई मार्गदर्शन की प्रतीक्षा न करें।",

    // Doctor Handoff additions
    doctorSummaryBtn: "डॉक्टर रिपोर्ट",
    doctorSummaryTitle: "अपने डॉक्टर के लिए एक संरचित रिपोर्ट बनाएं",
    copySummaryBtn: "कॉपी करें",
    copySummaryTitle: "रोगी पोर्टल में चिपकाने के लिए रिपोर्ट को क्लिपबोर्ड पर कॉपी करें",
    copiedSuccess: "डॉक्टर सारांश सफलतापूर्वक क्लिपबोर्ड पर कॉपी हो गया!"
  },
  gu: {
    appTitle: "હેલ્થકમ્પેનિયન",
    appSubtitle: "શેક્ષણિક ટ્રાયેજ મદદનીશ",
    onlineStatus: "એઆઈ ટ્રાયેજ ઓનલાઇન",
    chatTab: "ચેટ",
    trendsTab: "વલણો",
    quickSymptoms: "ઝડપી લક્ષણો",
    reportedVitals: "નોંધાયેલા વાઇટલ્સ",
    temperature: "તાપમાન (°F)",
    bloodPressure: "બ્લડ પ્રેશર (સિસ્ટોલિક/ડાયાસ્ટોલિક)",
    pulse: "પલ્સ (BPM)",
    tempPlaceholder: "દા.ત. 98.6",
    bpPlaceholder: "દા.ત. 120/80",
    pulsePlaceholder: "દા.ત. 72",
    vitalsTitle: "દર્દીના વાઇટલ્સ (વૈકલ્પિક)",
    vitalsSubtitle: "વાઇટલ્સ ઉમેરો (વૈકલ્પિક)",
    inputPlaceholder: "લક્ષણો લખો અથવા ફોટો અપલોડ કરો...",
    pdfButton: "પીડીએફ",
    pdfTitle: "વાતચીતને પીડીએફ તરીકે ડાઉનલોડ કરો",
    clearButton: "સાફ કરો",
    clearChatTitle: "વાતચીતનો ઇતિહાસ સાફ કરો",
    trendsTitle: "લક્ષણોની ગંભીરતાના વલણો",
    trendsSubtitle: "નોંધાયેલા ટ્રાયેજ પરિણામોનો શૈક્ષણિક સારાંશ",
    clearHistory: "ઇતિહાસ સાફ કરો",
    totalTriages: "કુલ ટ્રાયેજ",
    selfCare: "સ્વયં સંભાળ",
    seeDoctor: "ડૉક્ટરને બતાવો",
    emergency: "કટોકટી",
    severityTimeline: "ગંભીરતાની સમયરેખા",
    needMorePoints: "સમયરેખા સ્પાર્કલાઇન બનાવવા માટે વધુ લોગ ઉમેરો.",
    recentLogs: "તાજેતરના લોગ",
    noHistoryTitle: "હજી સુધી કોઈ ઇતિહાસ નથી",
    noHistoryDesc: "ચેટ શરૂ કરો અને લક્ષણો સબમિટ કરો. ઉકેલાયેલ ટ્રાયેજ મૂલ્યાંકન તમારો ટ્રેન્ડ ચાર્ટ બનાવશે.",
    confirmClearTrends: "શું તમે ખરેખર તમારો ટ્રેન્ડ ઇતિહાસ સાફ કરવા માંગો છો?",
    hospitalFinderTitle: "સ્થાનિક તબીબી સુવિધા શોધક",
    hospitalFinderDesc: "ત્વરિત સારવારની જરૂર છે? અમે તમારા ઉપકરણના સ્થાનના આધારે નજીકની હોસ્પિટલો અને ક્લિનિક્સ માટે જાહેર ઓપનસ્ટ્રીટમેપ ડેટા ચકાસી શકીએ છીએ.",
    findFacilities: "નજીકની હોસ્પિટલો અને ક્લિનિક્સ શોધો",
    locating: "સ્થાન શોધી રહ્યાં છીએ...",
    searchingFacilities: "ઓવરપાસ રજિસ્ટ્રીમાં શોધી રહ્યાં છીએ...",
    noFacilitiesFound: "તમારા સ્થાનના 5 કિમીની અંદર કોઈ હોસ્પિટલ કે ક્લિનિક મળ્યા નથી.",
    navigate: "દિશા-નિર્દેશો",
    safetyNoticeTitle: "કટોકટી અસ્વીકરણ:",
    safetyNoticeDesc: "આ સાધન નકશા ડેટાનો ઉપયોગ કરે છે અને તે સક્રિય કટોકટી રજિસ્ટ્રી નથી. જો તમે ગંભીર કટોકટીમાં હોવ, તો કૃપા કરીને દિશા-નિર્દેશો શોધવાને બદલે સીધા જ તમારી ઇમરજન્સી સેવાઓ (જેમ કે 108 / 112) ને કૉલ કરો.",
    vitalsSubmitted: "વાઇટલ્સ સફળતાપૂર્વક સબમિટ થયા.",
    aiSpeaking: "પ્રતિસાદ મોટેથી વાંચી રહ્યા છીએ...",
    loadingText: "ટ્રાયેજ વિશ્લેષણ ચાલુ છે...",
    clearConfirm: "શું તમે ખરેખર આ વાતચીત સાફ કરવા માંગો છો?",
    homeTitle: "તમારો એઆઈ આરોગ્ય સાથી",
    homeDesc: "તમારા લક્ષણોનું વર્ણન કરો અથવા તબીબી પ્રશ્નો પૂછો. તમે તમારી ચિંતાઓ ટાઇપ કરી શકો છો, માઇક્રોફોન બટનનો ઉપયોગ કરી શકો છો અથવા લક્ષણનો ફોટો અપલોડ કરી શકો છો (દા.ત. ચામડીના લાલ ચામઠા અથવા નાની ઈજા).",
    homeSuggestion1: "મને માથું દુખે છે અને સહેજ તાવ છે",
    homeSuggestion1Label: "\"મને માથું દુખે છે અને તાવ છે\"",
    homeSuggestion2: "મારી છાતી ભારે લાગે છે અને શ્વાસ લેવામાં તકલીફ થાય છે",
    homeSuggestion2Label: "\"છાતીમાં અકડામણ અને શ્વાસ ચડવો\"",
    disclaimer: "અસ્વીકરણ: હેલ્થકમ્પેનિયન માત્ર એક શૈક્ષણિક સાધન છે. તે તબીબી નિદાન, સારવારની સલાહ કે પ્રિસ્ક્રિપ્શન પ્રદાન કરતું નથી. કોઈપણ સ્વાસ્થ્ય સમસ્યા માટે અથવા તબીબી નિર્ણયો લેતા પહેલા હંમેશા લાઇસન્સ પ્રાપ્ત ડૉક્ટરની સલાહ લો. જો તમે કટોકટીનો સામનો કરી રહ્યા હોવ, તો તરત જ તમારી સ્થાનિક કટોકટી સેવાઓ (108/112) નો સંપર્ક કરો.",
    pdfHeading: "હૅલ્થકમ્પેનિયન — વાતચીતનો સારાંશ",
    pdfGenerated: "જનરેટ તારીખ:",
    pdfPage: "પૃષ્ઠ",
    potentialCauses: "સંભવિત કારણો:",
    redFlagsTitle: "ધ્યાન આપવાના ચેતવણી ચિહ્નો:",
    recommendedActionLabel: "ભલામણ કરેલ પગલાં:",

    // Vision and Emergency additions
    imageDisclaimer: "છબી વિશ્લેષણ ફક્ત સામાન્ય માર્ગદર્શન માટે છે - કોઈ તબીબી નિદાન નથી. ફોટો અથવા ઇજાનો ફોટો રૂબરૂ તપાસનું સ્થાન લઈ શકતો નથી.",
    invalidFormat: "અમાન્ય ફાઇલ ફોર્મેટ. કૃપા કરીને જેપીજી અથવા પીએનજી છબી અપલોડ કરો.",
    imageTooLarge: "છબીનું કદ 5MB ની મર્યાદા કરતાં વધી ગયું છે. કૃપા કરીને નાની છબી અપલોડ કરો.",
    emergencyAlertTitle: "ગંભીર કટોકટી મળી",
    emergencyAlertSubtitle: "તાત્કાલિક તબીબી ધ્યાન આપવાની ભલામણ કરવામાં આવે છે।",
    callEmergency: "ઇમરજન્સી સેવાઓને કૉલ કરો",
    changeNumber: "નંબર બદલો",
    emergencyAlertDisclaimer: "જો આ વાસ્તવિક કટોકટી હોય, તો હમણાં જ ઇમરજન્સી સેવાઓને કૉલ કરો. વધુ એઆઈ માર્ગદર્શનની રાહ જોશો નહીં.",

    // Doctor Handoff additions
    doctorSummaryBtn: "ડોક્ટર રીપોર્ટ",
    doctorSummaryTitle: "તમારા ડૉક્ટર માટે એક રિપોર્ટ બનાવો",
    copySummaryBtn: "કોપી કરો",
    copySummaryTitle: "પેશન્ટ પોર્ટલમાં પેસ્ટ કરવા માટે રિપોર્ટને ક્લિપબોર્ડ પર કોપી કરો",
    copiedSuccess: "ડોક્ટર રિપોર્ટ સફળતાપૂર્વક ક્લિપબોર્ડ પર કોપી થયો!"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [authSkipped, setAuthSkipped] = useState(() => {
    return localStorage.getItem('healthcompanion_auth_skipped') === 'true';
  });

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('healthcompanion_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse or access chat history from localStorage:", e);
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Vision image upload state (base64 string)
  const [image, setImage] = useState(null);

  // App view toggle: 'chat' or 'trends'
  const [view, setView] = useState('chat');

  // Selected Language: 'en', 'hi', or 'gu'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('healthcompanion_language') || 'en';
  });

  // Speech synthesis mute status
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('health_companion_is_muted');
    return saved ? JSON.parse(saved) : false;
  });

  // Dark mode theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('healthcompanion_theme');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Vitals state
  const [vitals, setVitals] = useState({
    temperature: '',
    bloodPressure: '',
    pulse: ''
  });
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // Initial load skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Listen to Supabase Auth Changes
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync / Migrate Local History when Logging In
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchSupabaseHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('messages')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setMessages(data[0].messages);
        } else {
          const localHistory = localStorage.getItem('healthcompanion_chat_history');
          const messagesToMigrate = localHistory ? JSON.parse(localHistory) : [];
          if (messagesToMigrate.length > 0) {
            await supabase
              .from('conversations')
              .insert([{ user_id: user.id, messages: messagesToMigrate }]);
            setMessages(messagesToMigrate);
          }
        }
      } catch (err) {
        console.error("Failed to load/migrate chat history from Supabase:", err);
      }
    };

    fetchSupabaseHistory();
  }, [user]);

  // Synchronize history state
  useEffect(() => {
    try {
      localStorage.setItem('healthcompanion_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to localStorage:", e);
    }

    if (user && supabase && messages.length > 0) {
      const syncHistory = async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            await supabase
              .from('conversations')
              .update({ messages })
              .eq('id', data[0].id);
          } else {
            await supabase
              .from('conversations')
              .insert([{ user_id: user.id, messages }]);
          }
        } catch (err) {
          console.error("Failed to synchronize conversation with Supabase:", err);
        }
      };
      syncHistory();
    }
  }, [messages, user]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (view === 'chat') {
      scrollToBottom();
    }
  }, [messages, view]);

  // Speech cancel when muted
  useEffect(() => {
    localStorage.setItem('health_companion_is_muted', JSON.stringify(isMuted));
    if (isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('healthcompanion_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('healthcompanion_language', lang);
  };

  // Handle Symptom Chip Tap
  const handleTapChip = (symptom) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return symptom;
      if (trimmed.toLowerCase().includes(symptom.toLowerCase())) return prev;
      return `${trimmed}, ${symptom}`;
    });
  };

  // Client-side image upload with validation
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert(t.invalidFormat || "Invalid file format. Please upload a JPG or PNG image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(t.imageTooLarge || "Image size exceeds the 5MB limit. Please upload a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Generate doctor summary PDF
  const handleGenerateDoctorSummary = () => {
    const summaryData = compileDoctorSummaryData(messages, language, TRANSLATIONS);
    generateDoctorSummaryPDF(summaryData, language, TRANSLATIONS);
  };

  // Copy doctor summary text to clipboard
  const handleCopyDoctorSummary = () => {
    const summaryData = compileDoctorSummaryData(messages, language, TRANSLATIONS);
    const plainText = generatePlainDoctorSummary(summaryData, language, TRANSLATIONS);
    navigator.clipboard.writeText(plainText).then(() => {
      alert(t.copiedSuccess || "Doctor summary copied to clipboard successfully!");
    }).catch(err => {
      console.error("Failed to copy doctor summary:", err);
    });
  };

  // Core send message logic
  const sendMessage = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText && !image) return;
    if (isLoading) return;

    setIsLoading(true);
    setErrorBanner(null);

    // Save image & vitals values to send, then reset local form buffers
    const currentImage = image;
    const currentVitals = { ...vitals };
    setImage(null);
    setVitals({ temperature: '', bloodPressure: '', pulse: '' });

    // Filter non-empty vitals values
    const vitalsPayload = {};
    if (currentVitals.temperature.trim()) vitalsPayload.temperature = currentVitals.temperature.trim();
    if (currentVitals.bloodPressure.trim()) vitalsPayload.bloodPressure = currentVitals.bloodPressure.trim();
    if (currentVitals.pulse.trim()) vitalsPayload.pulse = currentVitals.pulse.trim();

    // 1. Push user message with image reference & vitals to history list
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmedText || "Uploaded diagnostic photo",
      image: currentImage,
      vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : null
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // 2. Format history payload (last 6 messages, only text contents to save bandwidth)
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // 3. Query triage backend with language and image (base64)
      const bodyPayload = {
        message: trimmedText,
        history: historyPayload,
        vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : null,
        language: language
      };

      if (currentImage) {
        bodyPayload.image = currentImage;
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Server returned an invalid response.");
      }

      // 4. Push Assistant Response to State
      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.reply,
        possible_causes: data.possible_causes || [],
        severity: data.severity || 'Self-care',
        recommended_action: data.recommended_action || '',
        red_flags: data.red_flags || [],
        icon: data.icon || '🟢',
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 5. Speak reply aloud if not muted
      if (!isMuted) {
        speakText(data.reply, language);
      }

      // 6. Log resolved severity to Trends history (ignoring clarifying and error)
      if (data.severity && data.severity.toLowerCase() !== 'clarifying' && data.severity.toLowerCase() !== 'error') {
        try {
          const newEntry = {
            date: new Date().toISOString(),
            severity: data.severity,
            possible_causes: data.possible_causes || []
          };

          const existingLogs = JSON.parse(localStorage.getItem('healthcompanion_symptom_log')) || [];
          const updatedLogs = [newEntry, ...existingLogs].slice(0, 60);
          localStorage.setItem('healthcompanion_symptom_log', JSON.stringify(updatedLogs));

          if (user && supabase) {
            await supabase
              .from('symptom_logs')
              .insert([{
                user_id: user.id,
                severity: data.severity,
                possible_causes: data.possible_causes || []
              }]);
          }
        } catch (e) {
          console.error("Failed to append trends log:", e);
        }
      }

    } catch (err) {
      console.error("Error communicating with backend service:", err);
      
      const friendlyError = err.message || "Unable to establish communication with the triage engine.";
      setErrorBanner(friendlyError);

      const errorMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `⚠️ Error: ${friendlyError}`,
        severity: 'Error',
        icon: '⚪'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  const handleTranscript = (transcriptText) => {
    if (transcriptText && transcriptText.trim()) {
      sendMessage(transcriptText);
    }
  };

  const clearChat = () => {
    if (window.confirm(t.clearConfirm || "Are you sure you want to clear this conversation?")) {
      setMessages([]);
      localStorage.removeItem('healthcompanion_chat_history');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // Redesigned jsPDF Exporter (Professional PDF Layout)
  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const fileName = `HealthCompanion_Conversation_${dateStr}_${timeStr}.pdf`;

    // 1. Add Professional Branding & Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(t.pdfHeading || "HealthCompanion — Conversation Summary", 20, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    const now = new Date();
    doc.text(`${t.pdfGenerated || "Generated:"} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 25);

    // Header dividing rule
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 28, 190, 28);

    let yOffset = 36;
    let pageCount = 1;

    // 2. Map chat dialogue turns
    messages.forEach((msg) => {
      const isUser = msg.sender === 'user';
      const roleText = isUser ? "PATIENT:" : "ASSISTANT:";
      const roleColor = isUser ? [37, 99, 235] : [71, 85, 105]; // Blue vs Slate

      // Check height to handle multi-page auto-breaks
      if (yOffset > 260) {
        doc.addPage();
        pageCount += 1;
        yOffset = 20;

        // Re-draw minor header on new pages
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${t.appTitle} — ${t.pdfPage || "Page"} ${pageCount}`, 20, 12);
        doc.setDrawColor(241, 245, 249);
        doc.line(20, 15, 190, 15);
        yOffset = 24;
      }

      // Draw dialog role indicator
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...roleColor);
      doc.text(roleText, 20, yOffset);
      yOffset += 4;

      // Draw primary text with multi-line wrap
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700
      const splitText = doc.splitTextToSize(msg.text, 170);
      
      splitText.forEach((line) => {
        if (yOffset > 275) {
          doc.addPage();
          pageCount += 1;
          yOffset = 20;
        }
        doc.text(line, 20, yOffset);
        yOffset += 4.5;
      });

      // Potential Causes (PDF Layout)
      if (!isUser && msg.possible_causes && msg.possible_causes.length > 0) {
        yOffset += 2;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(t.potentialCauses || "Potential Causes:", 20, yOffset);
        yOffset += 4;
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        msg.possible_causes.forEach((cause) => {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(`• ${cause}`, 24, yOffset);
          yOffset += 4;
        });
      }

      // Red Flags (PDF Layout)
      if (!isUser && msg.red_flags && msg.red_flags.length > 0) {
        yOffset += 2;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text(t.redFlagsTitle || "Red Flags to Watch For:", 20, yOffset);
        yOffset += 4;
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        msg.red_flags.forEach((flag) => {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(`• ${flag}`, 24, yOffset);
          yOffset += 4;
        });
      }

      // Recommended Action (PDF Layout)
      if (!isUser && msg.recommended_action) {
        yOffset += 2;
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        
        const actionText = `${t.recommendedActionLabel || "Recommended Action:"} ${msg.recommended_action}`;
        const splitAction = doc.splitTextToSize(actionText, 170);
        splitAction.forEach((line) => {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(line, 20, yOffset);
          yOffset += 4;
        });
      }
      
      // 3. Draw Severity Badge (Only for assistant messages, ignoring clarifying)
      if (!isUser && msg.severity && msg.severity.toLowerCase() !== 'clarifying') {
        yOffset += 2;
        let badgeText = "";
        let badgeColor = [0, 0, 0];
        
        const sevLower = msg.severity.toLowerCase();
        if (sevLower === 'emergency') {
          badgeText = "EMERGENCY";
          badgeColor = [220, 38, 38]; // Red
        } else if (sevLower === 'doctor') {
          badgeText = "SEE A DOCTOR";
          badgeColor = [217, 119, 6]; // Amber
        } else if (sevLower === 'self-care') {
          badgeText = "SELF-CARE";
          badgeColor = [22, 163, 74]; // Green
        }
        
        if (badgeText) {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          doc.setFillColor(...badgeColor);
          doc.roundedRect(20, yOffset - 3.5, 30, 5, 1, 1, 'F');
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(badgeText, 22, yOffset);
          yOffset += 4.5;
        }
      }
      
      // 4. Draw divider line
      yOffset += 2;
      doc.setDrawColor(241, 245, 249);
      doc.line(20, yOffset, 190, yOffset);
      yOffset += 8;
    });
    
    // 5. Draw Safety Disclaimer
    const disclaimerText = t.disclaimer;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, 170);
    const disclaimerHeight = (splitDisclaimer.length * 4) + 12;
    
    if (yOffset + disclaimerHeight > 275) {
      doc.addPage();
      yOffset = 20;
    }
    
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.line(20, yOffset, 190, yOffset);
    yOffset += 8;
    
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    
    splitDisclaimer.forEach((line) => {
      doc.text(line, 20, yOffset);
      yOffset += 4;
    });
    
    doc.save(fileName);
  };

  // Render AuthScreen before chat page if guest flag is skipped
  if (!user && !authSkipped) {
    return (
      <AuthScreen
        onAuthSuccess={(u) => {
          setUser(u);
          setAuthSkipped(false);
          localStorage.removeItem('healthcompanion_auth_skipped');
        }}
        onSkip={() => {
          setAuthSkipped(true);
          localStorage.setItem('healthcompanion_auth_skipped', 'true');
        }}
        language={language}
        translations={TRANSLATIONS}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-between p-4 md:p-6 font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-md border border-white/50 dark:border-slate-800 p-4 mb-4 space-y-3">
        {/* Row 1: Brand Info & Profile/Language */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HealthCompanion Logo" className="w-9 h-9 object-contain rounded-xl border border-gray-105 dark:border-slate-700 shadow-sm" />
            <div>
              <h1 className="text-base font-extrabold text-gray-800 dark:text-gray-100 tracking-tight leading-none">{t.appTitle}</h1>
              <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                {t.onlineStatus}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Profile Info & Log out */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-slate-700">
                <span className="text-[10px] text-gray-650 dark:text-gray-300 font-bold max-w-[120px] truncate" title={user.email}>
                  👤 {user.email}
                </span>
                <button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                      setUser(null);
                      setMessages([]);
                      localStorage.removeItem('healthcompanion_chat_history');
                    }
                  }}
                  className="text-[10px] text-red-650 hover:text-red-750 font-bold ml-1.5 transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthSkipped(false);
                  localStorage.removeItem('healthcompanion_auth_skipped');
                }}
                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm transition"
              >
                Sign In
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center bg-gray-105 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-205/50 dark:border-slate-700">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'hi'
                    ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => handleLanguageChange('gu')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'gu'
                    ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-150 dark:border-slate-800" />

        {/* Row 2: Navigation Tab & Actions Group */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Side: View Toggle */}
          <div className="flex items-center bg-gray-105 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-205/50 dark:border-slate-700">
            <button
              onClick={() => setView('chat')}
              className={`px-3.5 py-1 text-[10px] font-bold rounded transition ${
                view === 'chat'
                  ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              {t.chatTab}
            </button>
            <button
              onClick={() => setView('trends')}
              className={`px-3.5 py-1 text-[10px] font-bold rounded transition ${
                view === 'trends'
                  ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              {t.trendsTab}
            </button>
          </div>

          {/* Right Side: Action Utilities */}
          <div className="flex items-center flex-wrap gap-1.5">
            {/* Dark Mode */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg transition"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg transition"
              title={isMuted ? "Unmute voice response" : "Mute voice response"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                </svg>
              )}
            </button>

            {/* Exporter PDF */}
            {messages.length > 0 && view === 'chat' && (
              <button
                onClick={exportToPDF}
                className="text-[10px] text-gray-650 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-25 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-2 py-1 rounded-md transition font-bold flex items-center gap-1"
                title={t.pdfTitle}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t.pdfButton}
              </button>
            )}

            {/* Generate Doctor Summary (PDF) */}
            {messages.length > 0 && view === 'chat' && (
              <button
                onClick={handleGenerateDoctorSummary}
                className="text-[10px] bg-blue-50 text-blue-650 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-750 px-2 py-1 rounded-md transition font-bold flex items-center gap-1"
                title={t.doctorSummaryTitle}
              >
                🩺 {t.doctorSummaryBtn}
              </button>
            )}

            {/* Copy Doctor Summary Text */}
            {messages.length > 0 && view === 'chat' && (
              <button
                onClick={handleCopyDoctorSummary}
                className="text-[10px] text-gray-650 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-25 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-2.5 py-1 rounded-md transition font-bold flex items-center gap-1"
                title={t.copySummaryTitle}
              >
                📋 {t.copySummaryBtn}
              </button>
            )}

            {/* Clear chat */}
            {messages.length > 0 && view === 'chat' && (
              <button
                onClick={clearChat}
                className="text-[10px] text-red-655 hover:text-red-750 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-955/20 px-2 py-1 rounded-md transition font-bold"
                title={t.clearChatTitle}
              >
                {t.clearButton}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Connection Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-2xl bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800/55 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl flex items-center justify-between mb-4 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorBanner}</span>
          </div>
          <button 
            onClick={() => setErrorBanner(null)} 
            className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm focus:outline-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main className="w-full max-w-2xl flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-slate-800 flex flex-col overflow-hidden mb-4 min-h-[60vh] max-h-[75vh]">
        {view === 'trends' ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <SymptomTrends user={user} supabase={supabase} language={language} translations={TRANSLATIONS} />
          </div>
        ) : (
          <>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">
                    💬
                  </div>
                  <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">{t.homeTitle}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                    {t.homeDesc}
                  </p>
                  
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => setInput(t.homeSuggestion1)} 
                      className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3.5 py-2 rounded-full transition font-medium border border-blue-100 dark:border-blue-900/50"
                    >
                      {t.homeSuggestion1Label}
                    </button>
                    <button 
                      onClick={() => setInput(t.homeSuggestion2)} 
                      className="text-xs bg-red-50 dark:bg-red-955/30 text-red-655 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-3.5 py-2 rounded-full transition font-medium border border-red-100 dark:border-red-900/50"
                    >
                      {t.homeSuggestion2Label}
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    API_URL={API_URL} 
                    language={language} 
                    translations={TRANSLATIONS} 
                  />
                ))
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start my-2">
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Symptom Quick-Tap Chips */}
            {messages.length === 0 && (
              <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30">
                <SymptomChips onTapChip={handleTapChip} />
              </div>
            )}

            {/* Collapsible Vitals Panel */}
            <div className="w-full border-t border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 p-4">
              <button
                type="button"
                onClick={() => setIsVitalsOpen(!isVitalsOpen)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
              >
                <span>{isVitalsOpen ? "▼" : "▶"} {t.vitalsSubtitle}</span>
              </button>
              {isVitalsOpen && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      {t.temperature}
                    </label>
                    <input
                      type="text"
                      value={vitals.temperature}
                      onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                      placeholder={t.tempPlaceholder}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      {t.bloodPressure}
                    </label>
                    <input
                      type="text"
                      value={vitals.bloodPressure}
                      onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                      placeholder={t.bpPlaceholder}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      {t.pulse}
                    </label>
                    <input
                      type="text"
                      value={vitals.pulse}
                      onChange={(e) => setVitals(prev => ({ ...prev, pulse: e.target.value }))}
                      placeholder={t.pulsePlaceholder}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Image Thumbnail Preview Block */}
            {image && (
              <div className="px-6 py-3 bg-gray-50/90 dark:bg-slate-900/60 border-t border-gray-150 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 relative w-full">
                  <div className="relative flex-shrink-0">
                    <img
                      src={image}
                      alt="Symptom preview"
                      className="w-14 h-14 object-cover rounded-lg border border-gray-300 dark:border-slate-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-750 text-white rounded-full p-0.5 text-[9px] shadow-sm w-4 h-4 flex items-center justify-center font-bold"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 italic leading-normal pr-4">
                    {t.imageDisclaimer}
                  </span>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="bg-white/95 dark:bg-slate-900/95 border-t border-gray-150 dark:border-slate-800 p-4 flex items-center gap-3">
              <VoiceButton 
                onTranscript={handleTranscript}
                disabled={isLoading}
                language={language}
              />

              {/* Image Upload Button */}
              <label 
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl cursor-pointer transition flex items-center justify-center" 
                title="Upload diagnostic photo (JPG/PNG)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
              </label>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder={t.inputPlaceholder}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-855 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
              />

              <button
                type="submit"
                disabled={(!input.trim() && !image) || isLoading}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </>
        )}
      </main>

      {/* Disclaimer */}
      <footer className="w-full max-w-2xl text-center px-4">
        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {t.disclaimer}
        </p>
      </footer>
    </div>
  );
}

export default App;
