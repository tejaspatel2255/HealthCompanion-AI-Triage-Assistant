import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import SymptomChips from './components/SymptomChips';
import SymptomTrends from './components/SymptomTrends';
import { speakText } from './utils/speech';
import { jsPDF } from 'jspdf';
import { compileDoctorSummaryData, generatePlainDoctorSummary, generateDoctorSummaryPDF } from './utils/doctorSummary';
import { supabase } from './utils/supabaseClient';
import AuthScreen from './components/AuthScreen';
import AnalyticsView from './components/AnalyticsView';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TRANSLATIONS = {
  en: {
    appTitle: "HealthCompanion",
    appSubtitle: "Educational Triage Assistant",
    onlineStatus: "AI Triage Online",
    chatTab: "Chat",
    trendsTab: "Trends",
    analyticsTab: "Analytics",
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
    imageTooLarge: "Image size exceeds the 20MB limit. Please upload a smaller image.",
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
    analyticsTab: "विश्लेषिकी",
    quickSymptoms: "त्वरित लक्षण",
    reportedVitals: "दर्ज वाइटल्स",
    temperature: "तापमान (°F)",
    bloodPressure: "रक्तचाप (सिस्टोलिक/डायस्टोलिक)",
    pulse: "पल्स (BPM)",
    tempPlaceholder: "जैसे 98.6",
    bpPlaceholder: "जैसे 120/80",
    pulsePlaceholder: "जैसे 72",
    vitalsTitle: "रोगी वाइटल्स (वैकल्पिक)",
    vitalsSubtitle: "वाइटल्स जोड़ें (वैकल्पिक)",
    inputPlaceholder: "लक्षणों का वर्णन करें या फोटो अपलोड करें...",
    pdfButton: "पीडीएफ",
    pdfTitle: "बातचीत को पीडीएफ के रूप में डाउनलोड करें",
    clearButton: "साफ करें",
    clearChatTitle: "बातचीत का इतिहास साफ करें",
    trendsTitle: "लक्षण गंभीरता रुझान",
    trendsSubtitle: "लॉग किए गए ट्राइएज परिणामों का शैक्षिक सारांश",
    clearHistory: "इतिहास साफ करें",
    totalTriages: "कुल ट्राइएज",
    selfCare: "स्व-देखभाल",
    seeDoctor: "डॉक्टर को दिखाएं",
    emergency: "आपातकालीन",
    severityTimeline: "गंभीरता समयरेखा",
    needMorePoints: "समयरेखा स्पार्कलाइन प्लॉट करने के लिए अधिक लॉग जोड़ें।",
    recentLogs: "हाल के लॉग",
    noHistoryTitle: "अभी तक कोई इतिहास नहीं",
    noHistoryDesc: "चैट बातचीत शुरू करें और लक्षण सबमिट करें। हल किए गए ट्राइएज मूल्यांकन आपका रुझान चार्ट बनाएंगे।",
    confirmClearTrends: "क्या आप वाकई अपना रुझान इतिहास साफ करना चाहते हैं?",
    hospitalFinderTitle: "स्थानीय चिकित्सा सुविधा खोजक",
    hospitalFinderDesc: "तत्काल देखभाल की आवश्यकता है? हम आपके डिवाइस स्थान के आधार पर नजदीकी अस्पतालों और क्लीनिकों के लिए सार्वजनिक रूप से उपलब्ध ओपनस्ट्रीटमैप डेटा की जांच कर सकते हैं।",
    findFacilities: "नजदीकी अस्पताल और क्लीनिक खोजें",
    locating: "स्थान खोज रहा है...",
    searchingFacilities: "ओवरपास रजिस्ट्री खोज रहा है...",
    noFacilitiesFound: "आपके स्थान के 5 किमी के भीतर कोई क्लिनिक या अस्पताल नहीं मिला।",
    navigate: "दिशा-निर्देश",
    safetyNoticeTitle: "आपातकालीन अस्वीकरण:",
    safetyNoticeDesc: "यह उपकरण क्राउड-सोर्स मैप डेटा का उपयोग करता है और कोई सक्रिय आपातकालीन रजिस्ट्री नहीं है। यदि आप जीवन-धमकाने वाले संकट का सामना कर रहे हैं, तो कृपया दिशा-निर्देशों की तलाश करने के बजाय सीधे अपनी आपातकालीन सेवाओं (जैसे 911 / 112) को कॉल करें।",
    vitalsSubmitted: "वाइटल्स सफलतापूर्वक सबमिट किए गए।",
    aiSpeaking: "जवाब जोर से पढ़ रहा है...",
    loadingText: "ट्राइएज विश्लेषण प्रगति पर है...",
    clearConfirm: "क्या आप वाकई इस बातचीत को साफ करना चाहते हैं?",
    homeTitle: "आपका एआई स्वास्थ्य साथी",
    homeDesc: "अपने लक्षणों का वर्णन करें या चिकित्सा प्रश्न पूछें। आप टाइप कर सकते हैं, माइक्रोफोन का उपयोग कर सकते हैं, या लक्षण का फोटो अपलोड कर सकते हैं (जैसे, त्वचा पर लाल चकत्ते या मामूली घाव)।",
    homeSuggestion1: "मुझे हल्का सिरदर्द और हल्का बुखार है",
    homeSuggestion1Label: "\"हल्का सिरदर्द और बुखार है\"",
    homeSuggestion2: "मेरी छाती में जकड़न है और सांस लेने में तकलीफ है",
    homeSuggestion2Label: "\"छाती में जकड़न और सांस की तकलीफ\"",
    disclaimer: "अस्वीकरण: हेल्थकंपैनियन पूरी तरह से एक शैक्षिक उपकरण है। यह चिकित्सा निदान, उपचार सलाह या नुस्खे प्रदान नहीं करता है। किसी भी स्वास्थ्य चिंता के लिए या चिकित्सा निर्णय लेने से पहले हमेशा एक लाइसेंस प्राप्त स्वास्थ्य पेशेवर से परामर्श लें। यदि आप आपात स्थिति का सामना कर रहे हैं, तो तुरंत अपने स्थानीय आपातकालीन सेवाओं (911/112) से संपर्क करें।",
    pdfHeading: "हेल्थकंपैनियन — बातचीत का सारांश",
    pdfGenerated: "उत्पन्न तिथि:",
    pdfPage: "पृष्ठ",
    potentialCauses: "संभावित कारण:",
    redFlagsTitle: "चेतावनी संकेत जिन पर ध्यान दें:",
    recommendedActionLabel: "अनुशंसित कार्रवाई:",

    // Vision and Emergency additions
    imageDisclaimer: "छवि विश्लेषण केवल सामान्य मार्गदर्शन के लिए है — कोई चिकित्सा निदान नहीं। चकत्ते या चोट का फोटो व्यक्तिगत जांच का स्थान नहीं ले सकता।",
    invalidFormat: "अमान्य फ़ाइल स्वरूप। कृपया JPG या PNG छवि अपलोड करें।",
    imageTooLarge: "छवि का आकार 20MB की सीमा से अधिक है। कृपया एक छोटी छवि अपलोड करें।",
    emergencyAlertTitle: "गंभीर आपात स्थिति का पता चला",
    emergencyAlertSubtitle: "तत्काल चिकित्सा ध्यान देने की सिफारिश की जाती है।",
    callEmergency: "आपातकालीन सेवाओं को कॉल करें",
    changeNumber: "नंबर बदलें",
    emergencyAlertDisclaimer: "यदि यह एक वास्तविक आपात स्थिति है, तो अभी आपातकालीन सेवाओं को कॉल करें। आगे एआई मार्गदर्शन की प्रतीक्षा न करें।",

    // Doctor Handoff additions
    doctorSummaryBtn: "डॉक्टर रिपोर्ट",
    doctorSummaryTitle: "अपने डॉक्टर के लिए एक रिपोर्ट तैयार करें",
    copySummaryBtn: "कॉपी करें",
    copySummaryTitle: "मरीज पोर्टल में पेस्ट करने के लिए रिपोर्ट को क्लिपबॉर्ड पर कॉपी करें",
    copiedSuccess: "डॉक्टर रिपोर्ट सफलतापूर्वक क्लिपबोर्ड पर कॉपी हो गई!"
  },
  gu: {
    appTitle: "હેલ્થકમ્પેનિયન",
    appSubtitle: "શૈક્ષણિક ટ્રાયેજ સહાયક",
    onlineStatus: "એઆઈ ટ્રાયેજ ઓનલાઇન",
    chatTab: "ચેટ",
    trendsTab: "ટ્રેન્ડ્સ",
    analyticsTab: "વિશ્લેષણ",
    quickSymptoms: "ઝડપી લક્ષણો",
    reportedVitals: "નોંધાયેલ વાઇટલ્સ",
    temperature: "તાપમાન (°F)",
    bloodPressure: "બ્લડ પ્રેશર (સિસ્ટોલિક/ડાયસ્ટોલિક)",
    pulse: "પલ્સ (BPM)",
    tempPlaceholder: "દા.ત. 98.6",
    bpPlaceholder: "દા.ત. 120/80",
    pulsePlaceholder: "દા.ત. 72",
    vitalsTitle: "દર્દીના વાઇટલ્સ (વૈકલ્પિક)",
    vitalsSubtitle: "વાઇટલ્સ ઉમેરો (વૈકલ્પિક)",
    inputPlaceholder: "લક્ષણો વર્ણવો અથવા ફોટો અપલોડ કરો...",
    pdfButton: "પીડીએફ",
    pdfTitle: "વાતચીતને પીડીએફ તરીકે ડાઉનલોડ કરો",
    clearButton: "સાફ કરો",
    clearChatTitle: "વાતચીતનો ઇતિહાસ સાફ કરો",
    trendsTitle: "લક્ષણોની ગંભીરતાના વલણો",
    trendsSubtitle: "લૉગ કરેલા ટ્રાયેજ પરિણામોનો શૈક્ષણિક સારાંશ",
    clearHistory: "ઇતિહાસ સાફ કરો",
    totalTriages: "કુલ ટ્રાયેજ",
    selfCare: "સ્વ-સંભાળ",
    seeDoctor: "ડૉક્ટરને બતાવો",
    emergency: "કટોકટી",
    severityTimeline: "ગંભીરતા સમયરેખા",
    needMorePoints: "સમયરેખા સ્પાર્કલાઇન પ્લોટ કરવા માટે વધુ લોગ ઉમેરો.",
    recentLogs: "તાજેતરના લોગ",
    noHistoryTitle: "હજુ સુધી કોઈ ઇતિહાસ નથી",
    noHistoryDesc: "ચેટ વાતચીત શરૂ કરો અને લક્ષણો સબમિટ કરો. ઉકેલાયેલ ટ્રાયેજ મૂલ્યાંકન તમારો ટ્રેન્ડ ચાર્ટ બનાવશે.",
    confirmClearTrends: "શું તમે ખરેખર તમારો ટ્રેન્ડ ઇતિહાસ સાફ કરવા માંગો છો?",
    hospitalFinderTitle: "સ્થાનિક તબીબી સુવિધા શોધક",
    hospitalFinderDesc: "તાત્કાલિક સારવારની જરૂર છે? અમે તમારા ઉપકરણના સ્થાનના આધારે નજીકની હોસ્પિટલો અને ક્લિનિક્સ માટે સાર્વજનિક રૂપે ઉપલબ્ધ ઓપનસ્ટ્રીટમેપ ડેટા ચકાસી શકીએ છીએ.",
    findFacilities: "નજીકની હોસ્પિટલો અને ક્લિનિક્સ શોધો",
    locating: "સ્થાન શોધી રહ્યું છે...",
    searchingFacilities: "ઓવરપાસ રજિસ્ટ્રી શોધી રહ્યું છે...",
    noFacilitiesFound: "તમારા સ્થાનના 5 કિમીની અંદર કોઈ ક્લિનિક અથવા હોસ્પિટલ મળી નથી.",
    navigate: "દિશાઓ",
    safetyNoticeTitle: "કટોકટી અસ્વીકરણ:",
    safetyNoticeDesc: "આ સાધન ક્રાઉડ-સોર્સ મેપ ડેટાનો ઉપયોગ કરે છે અને કોઈ સક્રિય કટોકટી રજિસ્ટ્રી નથી. જો તમે જીવન માટે જોખમી કટોકટીનો સામનો કરી રહ્યાં છો, તો કૃપા કરીને દિશાઓ શોધવાને બદલે સીધી તમારી કટોકટી સેવાઓ (જેમ કે 911 / 112) ને કૉલ કરો.",
    vitalsSubmitted: "વાઇટલ્સ સફળતાપૂર્વક સબમિટ થયા.",
    aiSpeaking: "જવાબ મોટેથી વાંચી રહ્યો છે...",
    loadingText: "ટ્રાયેજ વિશ્લેષણ ચાલુ છે...",
    clearConfirm: "શું તમે ખરેખર આ વાતચીત સાફ કરવા માંગો છો?",
    homeTitle: "તમારો એઆઈ હેલ્થ સાથી",
    homeDesc: "તમારા લક્ષણોનું વર્ણન કરો અથવા તબીબી પ્રશ્નો પૂછો. તમે ટાઇપ કરી શકો છો, માઇક્રોફોનનો ઉપયોગ કરી શકો છો અથવા લક્ષણનો ફોટો અપલોડ કરી શકો છો (દા.ત., ત્વચા પર ફોલ્લીઓ અથવા નાની ઈજા).",
    homeSuggestion1: "મને સામાન્ય માથાનો દુખાવો અને થોડો તાવ છે",
    homeSuggestion1Label: "\"સામાન્ય માથાનો દુખાવો અને તાવ\"",
    homeSuggestion2: "મારી છાતી જકડાઈ ગઈ છે અને શ્વાસ લેવામાં તકલીફ છે",
    homeSuggestion2Label: "\"છાતીમાં જકડામણ અને શ્વાસની તકલીફ\"",
    disclaimer: "અસ્વીકરણ: હેલ્થકમ્પેનિયન માત્ર એક શૈક્ષણિક સાધન છે. તે તબીબી નિદાન, સારવારની સલાહ અથવા પ્રિસ્ક્રિપ્શન આપતું નથી. કોઈ પણ સ્વાસ્થ્ય ચિંતા માટે અથવા તબીબી નિર્ણયો લેતા પહેલા હંમેશા લાઇસન્સ પ્રાપ્ત આરોગ્ય વ્યાવસાયિકની સલાહ લો. જો તમે કટોકટીનો સામનો કરી રહ્યા હોવ, તો તરત જ તમારા સ્થાનિક કટોકટી સેવાઓ (911/112) નો સંપર્ક કરો.",
    pdfHeading: "હેલ્થકમ્પેનિયન — વાતચીતનો સારાંશ",
    pdfGenerated: "જનરેટ તારીખ:",
    pdfPage: "પૃષ્ઠ",
    potentialCauses: "સંભવિત કારણો:",
    redFlagsTitle: "ચેતવણી ચિહ્નો જેના પર ધ્યાન આપવું:",
    recommendedActionLabel: "ભલામણ કરેલ પગલાં:",

    // Vision and Emergency additions
    imageDisclaimer: "છબી વિશ્લેષણ સામાન્ય માર્ગદર્શન માટે જ છે — કોઈ તબીબી નિદાન નથી. ફોલ્લીઓ અથવા ઈજાનો ફોટો રૂબરૂ તપાસનું સ્થાન લઈ શકતો નથી.",
    invalidFormat: "અમાન્ય ફાઇલ ફોર્મેટ. કૃપા કરીને JPG અથવા PNG છબી અપલોડ કરો.",
    imageTooLarge: "છબીનું કદ 20MB ની મર્યાદા કરતાં વધી ગયું છે. કૃપા કરીને નાની છબી અપલોડ કરો.",
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

  // Vision image upload state (base64 string)
  const [image, setImage] = useState(null);

  // App view toggle: 'chat', 'trends', or 'analytics'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

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

  // Client-side image upload with validation & canvas compression
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert(t.invalidFormat || "Invalid file format. Please upload a JPG or PNG image.");
      return;
    }

    const maxSize = 20 * 1024 * 1025; // 20MB to match Groq vision limits
    if (file.size > maxSize) {
      alert(t.imageTooLarge || "Image size exceeds the 20MB limit. Please upload a smaller image.");
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1024; // Limit dimensions for fast processing and small payload size
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to 85% JPEG quality to ensure payload is tiny (typically 100-250KB)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImage(dataUrl);
    };
    img.onerror = () => {
      alert("Failed to load image for processing.");
    };
    img.src = URL.createObjectURL(file);
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
      // 2. Format history payload carrying visual indicator & structural metadata for context continuity
      const historyPayload = messages.slice(-6).map(m => {
        if (m.sender === 'assistant') {
          let content = m.text;
          if (m.severity) {
            content += `\n[Triage Severity: ${m.severity}]`;
          }
          if (m.possible_causes && m.possible_causes.length > 0) {
            content += `\n[Suspected Causes: ${m.possible_causes.join(', ')}]`;
          }
          if (m.red_flags && m.red_flags.length > 0) {
            content += `\n[Red Flags: ${m.red_flags.join(', ')}]`;
          }
          return { role: 'assistant', content };
        } else {
          let content = m.text;
          if (m.image) {
            content = `[User uploaded image for analysis]\n${content}`;
          }
          return { role: 'user', content };
        }
      });

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

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Server connection error (${response.status}): Failed to parse response.`);
      }

      if (!response.ok) {
        throw new Error(data?.detail || `Server error (${response.status}): ${response.statusText || 'Unknown Error'}`);
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
        image: currentImage || null, // Keep image reference for custom result card rendering
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 5. Speak reply aloud if not muted
      if (!isMuted) {
        speakText(data.reply, language);
      }

      // 6. Log resolved severity to Trends history (ignoring clarifying, error, and unable to analyze)
      const sevLower = (data.severity || '').toLowerCase();
      if (data.severity && sevLower !== 'clarifying' && sevLower !== 'error' && sevLower !== 'unable to analyze') {
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
    <div className="h-[100dvh] bg-gradient-to-tr from-health-bg via-slate-50 to-health-bg/90 dark:from-health-bg-dark dark:via-slate-900 dark:to-health-bg-dark/95 flex flex-col items-center justify-between p-4 md:p-6 font-sans transition-colors duration-300 overflow-hidden">
      
      {/* Header */}
      <header className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-md border border-health-secondary/20 dark:border-slate-800 p-4 mb-4 space-y-3">
        {/* Row 1: Brand Info & Profile/Language */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-health-primary/10 dark:bg-health-primary/20 rounded-xl flex items-center justify-center text-xl shadow-inner">
              🩺
            </div>
            <div>
              <h1 className="text-base font-serif font-bold text-health-primary dark:text-health-secondary tracking-tight leading-none">{t.appTitle}</h1>
              <p className="text-[10px] text-health-success dark:text-health-success/80 font-bold flex items-center gap-1 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-health-success inline-block animate-pulse"></span>
                {t.onlineStatus}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Profile Info & Log out */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700">
                <span className="text-[10px] text-slate-600 dark:text-slate-350 font-bold max-w-[120px] truncate" title={user.email}>
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
                  className="text-[10px] text-health-emergency hover:text-health-emergency/80 font-bold ml-1.5 transition"
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
                className="text-[10px] bg-health-primary hover:bg-health-primary/90 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition font-serif"
              >
                Sign In
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-205/50 dark:border-slate-700">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-700 text-health-primary dark:text-health-secondary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-405'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'hi'
                    ? 'bg-white dark:bg-slate-700 text-health-primary dark:text-health-secondary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-405'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => handleLanguageChange('gu')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  language === 'gu'
                    ? 'bg-white dark:bg-slate-700 text-health-primary dark:text-health-secondary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-405'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-150 dark:border-slate-800" />

        {/* Row 2: Navigation Tab & Actions Group */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Side: View Toggle (Pill Shape) */}
          <div className="flex items-center bg-slate-105 dark:bg-slate-800 p-1 rounded-full border border-slate-200/50 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => setView('chat')}
              className={`px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-200 ${
                view === 'chat'
                  ? 'bg-health-primary text-white shadow-sm scale-105'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.chatTab}
            </button>
            <button
              onClick={() => setView('trends')}
              className={`px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-200 ${
                view === 'trends'
                  ? 'bg-health-primary text-white shadow-sm scale-105'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.trendsTab}
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-200 ${
                view === 'analytics'
                  ? 'bg-health-primary text-white shadow-sm scale-105'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.analyticsTab}
            </button>
          </div>

          {/* Right Side: Action Utilities Dropdown Menu */}
          <div className="relative">
            {isMenuOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm transition-all duration-200 z-50 relative"
              title="Open settings and tools menu"
            >
              <span>⚙️ {language === 'hi' ? 'विकल्प' : language === 'gu' ? 'વિકલ્પો' : 'Options'}</span>
              <span className="text-[8px] opacity-60">{isMenuOpen ? "▲" : "▼"}</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-150 dark:border-slate-800 py-1.5 z-50 flex flex-col transition-all duration-200">
                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    setTheme(prev => prev === 'light' ? 'dark' : 'light');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition font-semibold"
                >
                  <span className="text-sm">{theme === 'light' ? "🌙" : "☀️"}</span>
                  <span>{theme === 'light' ? (language === 'hi' ? 'डार्क मोड' : language === 'gu' ? 'ડાર્ક મોડ' : 'Dark Mode') : (language === 'hi' ? 'लाइट मोड' : language === 'gu' ? 'લાઇટ મોડ' : 'Light Mode')}</span>
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={() => {
                    setIsMuted(prev => !prev);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition font-semibold"
                >
                  <span className="text-sm">{isMuted ? "🔊" : "🔇"}</span>
                  <span>{isMuted ? (language === 'hi' ? 'आवाज़ चालू करें' : language === 'gu' ? 'અવાજ ચાલુ કરો' : 'Unmute Voice') : (language === 'hi' ? 'आवाज़ बंद करें' : language === 'gu' ? 'અવાજ બંધ કરો' : 'Mute Voice')}</span>
                </button>

                {/* Export Chat PDF */}
                {messages.length > 0 && view === 'chat' && (
                  <>
                    <hr className="border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={() => {
                        exportToPDF();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition font-semibold"
                    >
                      <span className="text-sm">📄</span>
                      <span>{t.pdfButton} {language === 'hi' ? 'डाउनलोड करें' : language === 'gu' ? 'ડાઉનલોડ કરો' : 'Export'}</span>
                    </button>
                  </>
                )}

                {/* Doctor PDF summary */}
                {messages.length > 0 && view === 'chat' && (
                  <button
                    onClick={() => {
                      handleGenerateDoctorSummary();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition font-semibold"
                  >
                    <span className="text-sm">🩺</span>
                    <span>{t.doctorSummaryBtn} (PDF)</span>
                  </button>
                )}

                {/* Copy Doctor Text */}
                {messages.length > 0 && view === 'chat' && (
                  <button
                    onClick={() => {
                      handleCopyDoctorSummary();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition font-semibold"
                  >
                    <span className="text-sm">📋</span>
                    <span>{t.copySummaryBtn}</span>
                  </button>
                )}

                {/* Clear Chat */}
                {messages.length > 0 && view === 'chat' && (
                  <>
                    <hr className="border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={() => {
                        clearChat();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-health-emergency hover:bg-red-50 dark:hover:bg-red-955/20 text-left transition font-extrabold"
                    >
                      <span className="text-sm">🗑️</span>
                      <span>{t.clearButton}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Connection Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-2xl bg-health-emergency/10 border border-health-emergency/30 text-health-emergency px-4 py-2.5 rounded-xl flex items-center justify-between mb-4 text-xs font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorBanner}</span>
          </div>
          <button 
            onClick={() => setErrorBanner(null)} 
            className="text-health-emergency hover:opacity-80 font-bold ml-2 text-sm focus:outline-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main className="w-full max-w-2xl flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-250/20 dark:border-slate-800 flex flex-col overflow-hidden mb-4 min-h-0">
        {view === 'trends' ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <SymptomTrends user={user} supabase={supabase} language={language} translations={TRANSLATIONS} />
          </div>
        ) : view === 'analytics' ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnalyticsView language={language} translations={TRANSLATIONS} />
          </div>
        ) : (
          <>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                  <div className="w-16 h-16 bg-health-primary/10 dark:bg-health-primary/20 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                    💬
                  </div>
                  <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-200 mb-1">{t.homeTitle}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    {t.homeDesc}
                  </p>
                  
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => setInput(t.homeSuggestion1)} 
                      className="text-xs bg-health-primary/5 dark:bg-health-primary/10 text-health-primary dark:text-health-secondary hover:bg-health-primary/10 dark:hover:bg-health-primary/20 px-3.5 py-2 rounded-full transition font-bold border border-health-primary/20 dark:border-health-primary/30"
                    >
                      {t.homeSuggestion1Label}
                    </button>
                    <button 
                      onClick={() => setInput(t.homeSuggestion2)} 
                      className="text-xs bg-health-emergency/5 dark:bg-health-emergency/10 text-health-emergency hover:bg-health-emergency/10 dark:hover:bg-health-emergency/20 px-3.5 py-2 rounded-full transition font-bold border border-health-emergency/20 dark:border-health-emergency/30"
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
                <div className="flex justify-start my-2 animate-pulse">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-health-primary dark:bg-health-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-health-primary dark:bg-health-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-health-primary dark:bg-health-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Symptom Quick-Tap Chips */}
            {messages.length === 0 && (
              <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <SymptomChips onTapChip={handleTapChip} />
              </div>
            )}

            {/* Modularized Chat Input & Vitals Panel */}
            <ChatInput
              input={input}
              setInput={setInput}
              image={image}
              setImage={setImage}
              vitals={vitals}
              setVitals={setVitals}
              isVitalsOpen={isVitalsOpen}
              setIsVitalsOpen={setIsVitalsOpen}
              isLoading={isLoading}
              language={language}
              translations={TRANSLATIONS}
              handleSend={handleSend}
              handleImageUpload={handleImageUpload}
              handleTranscript={handleTranscript}
            />
          </>
        )}
      </main>

      {/* Disclaimer */}
      <footer className="w-full max-w-2xl text-center px-4 py-1 shrink-0">
        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.disclaimer}
        </p>
      </footer>
    </div>
  );
}

export default App;
