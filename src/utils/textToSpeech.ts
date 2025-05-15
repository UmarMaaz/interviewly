
/**
 * Text-to-Speech utility for the AI avatar
 */

// Use the Web Speech API for text-to-speech
const synth = window.speechSynthesis;

/**
 * Speak text using the browser's speech synthesis
 */
export const speak = (text: string): void => {
  if (!text || !synth) return;
  
  // Cancel any ongoing speech
  stop();
  
  // Create a new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configure the voice
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Try to use a natural sounding voice if available
  const voices = synth.getVoices();
  const preferredVoice = voices.find(
    voice => voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Daniel')
  );
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  // Start speaking
  synth.speak(utterance);
};

/**
 * Stop any ongoing speech
 */
export const stop = (): void => {
  if (synth) {
    synth.cancel();
  }
};

/**
 * Check if speech synthesis is currently speaking
 */
export const isSpeaking = (): boolean => {
  return synth ? synth.speaking : false;
};
