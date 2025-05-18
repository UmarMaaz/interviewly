
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

// Speech completion callback
let onSpeechCompleteCallback: (() => void) | null = null;

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
 * Register a callback to be called when speech completes
 */
export const onSpeechComplete = (callback: () => void): void => {
  onSpeechCompleteCallback = callback;
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
      
      // Call completion callback if registered
      if (onSpeechCompleteCallback) {
        onSpeechCompleteCallback();
        onSpeechCompleteCallback = null;
      }
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
    
    // Call completion callback if registered
    if (onSpeechCompleteCallback) {
      onSpeechCompleteCallback();
      onSpeechCompleteCallback = null;
    }
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
 * Get conversation acknowledgment phrases for natural dialogue
 * These are used to respond to the user's answer before providing feedback
 */
export const getAcknowledgmentPhrase = (): string => {
  const phrases = [
    "I see, thank you for sharing that perspective. ",
    "That's really interesting. I appreciate your detailed response. ",
    "Thank you for that thoughtful answer. ",
    "I understand what you're saying. That's helpful context. ",
    "Great point. I like how you approached that question. ",
    "That makes a lot of sense. Thanks for explaining your thought process. ",
    "Okay, I appreciate how you framed that response. ",
    "Thanks for sharing that experience. It gives me good insight. ",
    "I appreciate your comprehensive response. ",
    "That's a valuable perspective. Thank you for elaborating. ",
    "I see how you're thinking about this. Thanks for your candid response. ",
    "Thank you for that well-structured answer. ",
    "That's a thoughtful approach to the question. ",
    "I appreciate you sharing your personal experience with this topic. ",
    "Thank you for that detailed explanation. "
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
};

/**
 * Get conversation transition phrases
 * These are used when moving from one question to the next
 */
export const getTransitionPhrase = (): string => {
  const phrases = [
    "Let's move on to our next question. I'm interested to hear your thoughts on... ",
    "Now, I'd like to shift gears a bit and ask about... ",
    "Great, let's proceed to another important topic. ",
    "Moving forward, I'd like to ask you about... ",
    "Let's explore another aspect of your experience. ",
    "Excellent response. For our next question, I'd like to understand... ",
    "Thank you for that answer. Now, I'm curious about... ",
    "That's helpful to know. Let's talk about something different now... ",
    "Well articulated. Let's build on that with our next question... ",
    "I appreciate that response. Let's dive into another area... ",
    "That gives me a good picture. Let's switch topics and discuss... ",
    "Thanks for sharing that. Moving to our next question... ",
    "Very insightful. Let's continue with another important question... ",
    "That's valuable information. Now I'd like to hear about... ",
    "Thank you for that perspective. Let's talk about something else... "
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
};
