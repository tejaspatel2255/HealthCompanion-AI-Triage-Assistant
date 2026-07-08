/**
 * Speaks the provided text using the browser's Web Speech API.
 * Configured dynamically to support translation languages.
 */
export const speakText = (text, langCode = 'en') => {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis is not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech playback
  window.speechSynthesis.cancel();

  // Strip out emojis and common markdown symbols to avoid strange speech pronunciations
  const cleanedText = text
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
    .replace(/SEVERITY:/gi, '')
    .replace(/[*_`#~]/g, '')
    .trim();

  if (!cleanedText) return;

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  // Set language speaking code
  const langMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'gu': 'gu-IN'
  };
  
  utterance.lang = langMap[langCode.toLowerCase()] || 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
};
