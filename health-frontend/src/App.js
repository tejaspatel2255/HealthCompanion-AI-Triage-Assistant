import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import VoiceButton from './components/VoiceButton';
import SymptomChips from './components/SymptomChips';
import { speakText } from './utils/speech';
import { jsPDF } from 'jspdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
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

  // Initial load skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom and save history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    try {
      localStorage.setItem('healthcompanion_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to localStorage:", e);
    }
  }, [messages]);

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

  // Handle Symptom Chip Tap
  const handleTapChip = (symptom) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return symptom;
      if (trimmed.toLowerCase().includes(symptom.toLowerCase())) return prev;
      return `${trimmed}, ${symptom}`;
    });
  };

  // Core send message logic
  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userText = text.trim();
    setIsLoading(true);
    setErrorBanner(null);

    // Save vitals reference to attach, then clear form
    const currentVitals = { ...vitals };
    setVitals({ temperature: '', bloodPressure: '', pulse: '' });

    // 1. Push user message to state
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: userText,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // 2. Format history payload (last 6 messages)
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // Filter non-empty vitals values
      const vitalsPayload = {};
      if (currentVitals.temperature.trim()) vitalsPayload.temperature = currentVitals.temperature.trim();
      if (currentVitals.bloodPressure.trim()) vitalsPayload.bloodPressure = currentVitals.bloodPressure.trim();
      if (currentVitals.pulse.trim()) vitalsPayload.pulse = currentVitals.pulse.trim();

      // 3. Query triage backend
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : null
        }),
      });

      if (!response.ok) {
        let errorDetail = "Server returned an error response";
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorDetail = errData.detail;
          }
        } catch (_) {}
        throw new Error(errorDetail);
      }

      const data = await response.json();

      // 4. Push assistant response to state
      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.reply,
        possible_causes: data.possible_causes || [],
        severity: data.severity || null, // Optional severity classification
        recommended_action: data.recommended_action || '',
        red_flags: data.red_flags || [],
        icon: data.icon || null,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (!isMuted) {
        speakText(data.reply);
      }

    } catch (error) {
      console.error('Error fetching chat response:', error);
      let bannerMsg = "Unreachable server. Please make sure the backend is running at " + API_URL;
      if (error.message && error.message !== 'Failed to fetch' && !error.message.includes('JSON')) {
        bannerMsg = `API Error: ${error.message}`;
      }
      setErrorBanner(bannerMsg);
      
      let friendlyText = `I'm having trouble getting a response from the backend: ${error.message || 'Please try again shortly.'}`;
      if (error.message && error.message.includes("sending messages too quickly")) {
        friendlyText = error.message;
      }

      const errorMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: friendlyText,
        severity: 'Error',
        icon: '⚠️',
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      if (!isMuted) {
        speakText(errorMessage.text);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleTranscript = (transcript) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear your conversation?")) {
      setMessages([]);
      try {
        localStorage.removeItem('healthcompanion_chat_history');
      } catch (e) {
        console.error("Failed to remove chat history from localStorage:", e);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // PDF Export Generation
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "HealthCompanion — Conversation Summary";
    
    // Formatting date-time for title and file naming
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    const timestampStr = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    const fileName = `HealthCompanion_Conversation_${yyyy}-${mm}-${dd}_${hh}${min}.pdf`;
    
    // Document Title Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, 20, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${timestampStr}`, 20, 26);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 30, 190, 30);
    
    let yOffset = 38;
    
    messages.forEach((msg) => {
      const isUser = msg.sender === 'user';
      const roleLabel = isUser ? "You" : "HealthCompanion";
      
      // Calculate wrapped text lines
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(msg.text, 170);
      
      // Calculate dynamic block height
      let blockHeight = 5 + 4 + (splitText.length * 5);
      if (!isUser) {
        if (msg.possible_causes && msg.possible_causes.length > 0) {
          blockHeight += 6 + (msg.possible_causes.length * 4);
        }
        if (msg.red_flags && msg.red_flags.length > 0) {
          blockHeight += 6 + (msg.red_flags.length * 4);
        }
        if (msg.recommended_action) {
          blockHeight += 6;
        }
        if (msg.severity && msg.severity.toLowerCase() !== 'clarifying') {
          blockHeight += 8;
        }
      }
      blockHeight += 12;
      
      // Check page overflow
      if (yOffset + blockHeight > 275) {
        doc.addPage();
        yOffset = 20;
      }
      
      // 1. Draw Role Label
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      if (isUser) {
        doc.setTextColor(37, 99, 235); // Blue
      } else {
        doc.setTextColor(13, 148, 136); // Teal
      }
      doc.text(roleLabel, 20, yOffset);
      yOffset += 5;
      
      // 2. Draw Message Text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700
      splitText.forEach((line) => {
        doc.text(line, 20, yOffset);
        yOffset += 5;
      });

      // Potential Causes (PDF Layout)
      if (!isUser && msg.possible_causes && msg.possible_causes.length > 0) {
        yOffset += 2;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Potential Causes:", 20, yOffset);
        yOffset += 4;
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        msg.possible_causes.forEach((cause) => {
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
        doc.text("Red Flags to Watch For:", 20, yOffset);
        yOffset += 4;
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        msg.red_flags.forEach((flag) => {
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
        doc.text(`Recommended Action: ${msg.recommended_action}`, 20, yOffset);
        yOffset += 4;
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
          // Draw small rounded background card/rectangle
          doc.setFillColor(...badgeColor);
          doc.roundedRect(20, yOffset - 3.5, 30, 5, 1, 1, 'F');
          
          // Draw badge text inside rect
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255); // White
          doc.text(badgeText, 22, yOffset);
          yOffset += 4;
        }
      }
      
      // 4. Draw exchange divider
      yOffset += 2;
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(20, yOffset, 190, yOffset);
      yOffset += 8;
    });
    
    // 5. Draw Safety Disclaimer (Exactly once at the end)
    const disclaimerText = "Disclaimer: HealthCompanion is strictly an educational tool and does not provide formal medical diagnoses, prescriptions, or treatment plans. Always consult a licensed healthcare professional for any health concerns. If you are experiencing a medical emergency, please contact your local emergency services (e.g. 911 or 112) immediately.";
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

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
        <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-slate-800 p-6 space-y-6 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-slate-855 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/4"></div>
            </div>
          </div>
          {/* Messages area Skeleton */}
          <div className="space-y-4 py-8">
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-3/4"></div>
            <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl w-1/2 ml-auto"></div>
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-2/3"></div>
          </div>
          {/* Input Skeleton */}
          <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-between p-4 md:p-6 font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-md border border-white/50 dark:border-slate-800 px-6 py-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HealthCompanion Logo" className="w-10 h-10 object-contain rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm" />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">HealthCompanion</h1>
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              AI Triage Online
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Dark Mode toggle */}
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>

          {/* Mute/Unmute toggle */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
            title={isMuted ? "Unmute voice response" : "Mute voice response"}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
              </svg>
            )}
          </button>

          {/* Export conversation as PDF */}
          {messages.length > 0 && (
            <button
              onClick={exportToPDF}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
              title="Download conversation as PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 bg-gray-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg transition font-medium"
              title="Clear conversation"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Connection Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/55 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl flex items-center justify-between mb-4 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorBanner}</span>
          </div>
          <button 
            onClick={() => setErrorBanner(null)} 
            className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm focus:outline-none"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Chat Interface */}
      <main className="w-full max-w-2xl flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-slate-800 flex flex-col overflow-hidden mb-4 h-[65vh]">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">
                💬
              </div>
              <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">Your AI Health Companion</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                Describe your symptoms or ask medical questions. You can type or use the microphone button to speak your concerns.
              </p>
              
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => setInput("I have a dull headache and a slight fever")} 
                  className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3.5 py-2 rounded-full transition font-medium border border-blue-100 dark:border-blue-900/50"
                >
                  "I have a dull headache and fever"
                </button>
                <button 
                  onClick={() => setInput("My chest feels tight and I'm short of breath")} 
                  className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-3.5 py-2 rounded-full transition font-medium border border-red-100 dark:border-red-900/50"
                >
                  "Tight chest & short of breath"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start my-2">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
          >
            <span>{isVitalsOpen ? "▼" : "▶"} Add vitals (optional)</span>
          </button>
          {isVitalsOpen && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Temp (°F)
                </label>
                <input
                  type="text"
                  value={vitals.temperature}
                  onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                  placeholder="e.g. 98.6"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  BP (Systolic/Diastolic)
                </label>
                <input
                  type="text"
                  value={vitals.bloodPressure}
                  onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                  placeholder="e.g. 120/80"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Pulse (BPM)
                </label>
                <input
                  type="text"
                  value={vitals.pulse}
                  onChange={(e) => setVitals(prev => ({ ...prev, pulse: e.target.value }))}
                  placeholder="e.g. 72"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="bg-white/95 dark:bg-slate-900/95 border-t border-gray-150 dark:border-slate-800 p-4 flex items-center gap-3">
          
          <VoiceButton 
            onTranscript={handleTranscript}
            disabled={isLoading}
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type symptoms or speak into the microphone..."
            className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </main>

      {/* Disclaimer */}
      <footer className="w-full max-w-2xl text-center px-4">
        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong>Disclaimer:</strong> HealthCompanion is strictly an educational tool. It does not provide medical diagnoses, treatment advice, or prescriptions. Always consult a licensed healthcare professional for any health concerns or before making medical decisions. If you are facing an emergency, contact your local emergency services (911/112) immediately.
        </p>
      </footer>
    </div>
  );
}

export default App;
