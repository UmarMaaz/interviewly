
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
  
  // Configure the voice for more natural speech
  utterance.rate = 0.9; // Slightly slower rate for more natural speech
  utterance.pitch = 1.1; // Slightly higher pitch
  utterance.volume = 1.0;
  
  // Add natural pauses with punctuation
  text = addNaturalPauses(text);
  utterance.text = text;
  
  // Get all available voices
  let voices = synth.getVoices();
  
  // If voices array is empty, try again after a small delay
  // This is needed for some browsers that load voices asynchronously
  if (voices.length === 0) {
    setTimeout(() => {
      voices = synth.getVoices();
      setPreferredVoice(utterance, voices);
    }, 100);
  } else {
    setPreferredVoice(utterance, voices);
  }
  
  // Start speaking
  synth.speak(utterance);
};

/**
 * Helper function to add natural pauses
 */
const addNaturalPauses = (text: string): string => {
  // Add slight pauses after punctuation for more natural speech
  return text
    .replace(/\./g, '. ') // Add slight pause after periods
    .replace(/\?/g, '? ') // Add slight pause after questions
    .replace(/\!/g, '! ') // Add slight pause after exclamations
    .replace(/,/g, ', '); // Add slight pause after commas
};

/**
 * Helper function to set the preferred voice
 */
const setPreferredVoice = (utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]): void => {
  // Try to find a more natural sounding voice
  // Priority order: Google voices > Samantha > Daniel > Other natural voices
  const preferredVoice = voices.find(
    voice => 
      voice.name.includes('Google UK English Female') || 
      voice.name.includes('Google US English') ||
      voice.name.includes('Samantha') || 
      voice.name.includes('Daniel') ||
      voice.name.includes('Karen') ||
      voice.name.includes('Moira') ||
      voice.name.includes('Alex')
  );
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    console.log('Using voice:', preferredVoice.name);
  } else if (voices.length > 0) {
    // If none of our preferred voices are available, just use the first voice
    utterance.voice = voices[0];
    console.log('Using default voice:', voices[0].name);
  }
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

/**
 * Get conversation filler phrases for natural dialogue
 */
export const getAcknowledgmentPhrase = (): string => {
  const phrases = [
    "I see, ",
    "That's interesting. ",
    "Thank you for sharing that. ",
    "I understand. ",
    "Great point. ",
    "That makes sense. ",
    "Okay, good to know. ",
    "Thanks for explaining. ",
    "I appreciate your response. ",
    "That's helpful context. "
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
};

