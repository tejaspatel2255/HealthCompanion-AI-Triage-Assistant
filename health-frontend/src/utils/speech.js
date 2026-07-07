/**
 * Speaks the provided text using the browser's Web Speech API.
 * Cleans the input to remove emojis and Markdown characters for smoother playback.
 */
export const speakText = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis is not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech playback
  window.speechSynthesis.cancel();

  // Strip out emojis and common markdown symbols to avoid strange speech pronunciations
  const cleanedText = text
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '') // remove emojis
    .replace(/SEVERITY:/gi, 'Severity evaluation:')
    .replace(/[*_`#~]/g, '') // remove markdown characters
    .trim();

  if (!cleanedText) return;

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.lang = 'en-US';
  utterance.rate = 1.0; // standard speaking rate
  utterance.pitch = 1.0; // standard pitch

  window.speechSynthesis.speak(utterance);
};
