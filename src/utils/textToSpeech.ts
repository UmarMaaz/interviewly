
/**
 * Text-to-Speech utility for the AI avatar
 * Uses ElevenLabs API for high-quality voice and Web Speech API as fallback
 */

// Store ElevenLabs API key (will be entered by user)
let elevenLabsApiKey: string | null = null;

// Voice ID for ElevenLabs (using Sarah voice by default)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice
let currentVoiceId = DEFAULT_VOICE_ID;

// Current speaking state
let isSpeakingState = false;
let currentAudio: HTMLAudioElement | null = null;

// Fallback to Web Speech API
const synth = window.speechSynthesis;

/**
 * Set the ElevenLabs API key
 */
export const setApiKey = (apiKey: string): void => {
  elevenLabsApiKey = apiKey;
  // Store in localStorage for persistence
  localStorage.setItem('elevenLabsApiKey', apiKey);
};

/**
 * Check if API key exists
 */
export const hasApiKey = (): boolean => {
  // Try to load from localStorage if not set
  if (!elevenLabsApiKey) {
    elevenLabsApiKey = localStorage.getItem('elevenLabsApiKey');
  }
  return !!elevenLabsApiKey;
};

/**
 * Set the voice ID to use
 */
export const setVoiceId = (voiceId: string): void => {
  currentVoiceId = voiceId;
};

/**
 * Speak text using ElevenLabs or fallback to browser's speech synthesis
 */
export const speak = async (text: string): Promise<void> => {
  if (!text) return;
  
  // Cancel any ongoing speech
  stop();
  
  // Add natural pauses
  text = addNaturalPauses(text);
  
  // Set speaking state
  isSpeakingState = true;
  
  // Try ElevenLabs if we have API key
  if (hasApiKey()) {
    try {
      await speakWithElevenLabs(text);
      return;
    } catch (error) {
      console.error('ElevenLabs error:', error);
      // Fall back to Web Speech API
    }
  }
  
  // Fallback to Web Speech API
  speakWithWebSpeechAPI(text);
};

/**
 * Speak using ElevenLabs API
 */
const speakWithElevenLabs = async (text: string): Promise<void> => {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey || ''
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create audio element and play
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    
    audio.onended = () => {
      isSpeakingState = false;
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };
    
    await audio.play();
  } catch (error) {
    console.error('Error with ElevenLabs TTS:', error);
    isSpeakingState = false;
    throw error;
  }
};

/**
 * Fallback speech synthesis using Web Speech API
 */
const speakWithWebSpeechAPI = (text: string): void => {
  if (!synth) {
    isSpeakingState = false;
    return;
  }
  
  // Create a new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configure the voice for more natural speech
  utterance.rate = 0.9; // Slightly slower rate for more natural speech
  utterance.pitch = 1.1; // Slightly higher pitch
  utterance.volume = 1.0;
  
  // Get all available voices
  let voices = synth.getVoices();
  
  // If voices array is empty, try again after a small delay
  if (voices.length === 0) {
    setTimeout(() => {
      voices = synth.getVoices();
      setPreferredVoice(utterance, voices);
    }, 100);
  } else {
    setPreferredVoice(utterance, voices);
  }
  
  // Set end handler
  utterance.onend = () => {
    isSpeakingState = false;
  };
  
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
  // Stop ElevenLabs audio if playing
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  // Stop Web Speech API if speaking
  if (synth) {
    synth.cancel();
  }
  
  isSpeakingState = false;
};

/**
 * Check if speech synthesis is currently speaking
 */
export const isSpeaking = (): boolean => {
  return isSpeakingState || (synth ? synth.speaking : false);
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

/**
 * Get conversation transition phrases
 */
export const getTransitionPhrase = (): string => {
  const phrases = [
    "Let's move on to the next question. ",
    "Now, let's continue with the next topic. ",
    "Great, let's proceed to the next question. ",
    "Moving forward to our next question. ",
    "Let's explore another aspect of your experience. ",
    "Excellent response. For our next question... ",
    "Thank you for that answer. Now I'd like to ask you about... ",
    "That's helpful to know. Let's shift our discussion to... ",
    "Well articulated. Moving on, I'd like to ask... ",
    "I appreciate that response. Next, I'd like to hear about... "
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
};

