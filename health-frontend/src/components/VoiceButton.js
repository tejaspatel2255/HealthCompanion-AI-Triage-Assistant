import React, { useState } from 'react';

const VoiceButton = ({ onTranscript, disabled, language = 'en' }) => {
  const [isListening, setIsListening] = useState(false);

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try using Google Chrome or Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Map language selections
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'gu': 'gu-IN'
    };
    recognition.lang = langMap[language.toLowerCase()] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please check your browser permission settings.");
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && onTranscript) {
        onTranscript(transcript);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={startRecognition}
      disabled={disabled || isListening}
      className={`p-3 rounded-xl transition relative flex items-center justify-center ${
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
          : 'bg-gray-150 hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
      }`}
      title={isListening ? "Listening..." : "Speak symptoms"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
      </svg>
      {isListening && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
      )}
    </button>
  );
};

export default VoiceButton;
