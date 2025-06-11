
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import Avatar from '@/components/Avatar';
import QuestionPanel from '@/components/QuestionPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import ApiKeyModal from '@/components/ApiKeyModal';
import { UserProfile, generateQuestions, getAIFeedback, InterviewQuestion, Feedback } from '@/utils/interviewService';
import { getAcknowledgmentPhrase, getTransitionPhrase, speak, isSpeaking, stop } from '@/utils/textToSpeech';

interface InterviewRoomProps {
  userProfile: UserProfile;
}

const InterviewRoom: React.FC<InterviewRoomProps> = ({ userProfile }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [allResponses, setAllResponses] = useState<string[]>([]);
  const [finalFeedback, setFinalFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const [isGeneratingFinalFeedback, setIsGeneratingFinalFeedback] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [conversationState, setConversationState] = useState<
    'greeting' | 'asking' | 'acknowledging' | 'transition' | 'finalFeedback' | 'complete'
  >('greeting');
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [speechSupportChecked, setSpeechSupportChecked] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Check speech recognition support on mount
  useEffect(() => {
    const checkSpeechSupport = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
      setSpeechSupportChecked(true);
    };
    
    checkSpeechSupport();
  }, []);

  // Generate initial questions
  useEffect(() => {
    const initInterview = async () => {
      try {
        setIsGeneratingQuestions(true);
        const initialQuestions = await generateQuestions(userProfile);
        setQuestions(initialQuestions);
        setAllResponses(new Array(initialQuestions.length).fill(''));
        setIsGeneratingQuestions(false);
        
        // Start with greeting
        const greeting = `Hello ${userProfile.name}, welcome to your AI interview session for the ${userProfile.role} position. I'll be asking you ${initialQuestions.length} questions today. Let's begin.`;
        setCurrentSpeechText(greeting);
        setConversationState('greeting');
      } catch (error) {
        console.error("Error generating questions:", error);
        toast({
          title: "Error",
          description: "Failed to generate interview questions. Please try again.",
          variant: "destructive"
        });
        setIsGeneratingQuestions(false);
      }
    };
    
    initInterview();
  }, [userProfile]);

  // Handle speech completion and state transitions
  useEffect(() => {
    if (!currentSpeechText) return;
    
    speak(currentSpeechText);
    
    // Set up listener for when speech completes
    const checkSpeechComplete = setInterval(() => {
      if (!isSpeaking()) {
        clearInterval(checkSpeechComplete);
        handleSpeechComplete();
      }
    }, 300);
    
    return () => clearInterval(checkSpeechComplete);
  }, [currentSpeechText]);

  const handleSpeechComplete = () => {
    switch (conversationState) {
      case 'greeting':
        // After greeting, move to asking the first question
        setTimeout(() => {
          setConversationState('asking');
          if (questions.length > 0) {
            setCurrentSpeechText(questions[0].question);
          }
        }, 1000);
        break;
        
      case 'asking':
        // After asking question, wait for user response
        setCurrentSpeechText('');
        break;
        
      case 'acknowledging':
        // After acknowledging, either ask next question or complete interview
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            setConversationState('transition');
            const transition = getTransitionPhrase();
            const nextQuestion = questions[currentQuestionIndex + 1].question;
            setCurrentSpeechText(`${transition} ${nextQuestion}`);
          } else {
            // All questions complete, generate final feedback
            generateFinalFeedback();
          }
        }, 1000);
        break;
        
      case 'transition':
        // After transition, move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setConversationState('asking');
        setCurrentSpeechText('');
        break;
        
      case 'finalFeedback':
        // After final feedback, complete interview
        setConversationState('complete');
        setCurrentSpeechText(`Thank you for completing the interview, ${userProfile.name}. This concludes our session. Good luck with your future interviews!`);
        break;
        
      case 'complete':
        // Interview fully complete
        setInterviewComplete(true);
        setCurrentSpeechText('');
        break;
    }
  };

  const handleSubmitResponse = () => {
    if (!userResponse.trim()) {
      toast({
        title: "Warning",
        description: "Please provide a response before submitting.",
        variant: "default"
      });
      return;
    }
    
    // Stop listening if active
    if (isListening) {
      stopListening();
    }
    
    // Store the response
    const newResponses = [...allResponses];
    newResponses[currentQuestionIndex] = userResponse;
    setAllResponses(newResponses);
    
    // Acknowledge the response
    setConversationState('acknowledging');
    const acknowledgment = getAcknowledgmentPhrase();
    setCurrentSpeechText(acknowledgment);
    
    // Clear the current response
    setUserResponse('');
  };

  const generateFinalFeedback = async () => {
    setIsGeneratingFinalFeedback(true);
    setConversationState('finalFeedback');
    
    try {
      // Combine all questions and responses for comprehensive feedback
      const interviewSummary = questions.map((q, index) => ({
        question: q.question,
        response: allResponses[index]
      }));
      
      // Get comprehensive feedback for the entire interview
      const feedback = await getAIFeedback(
        `Complete interview assessment for ${questions.length} questions`,
        interviewSummary.map(item => `Q: ${item.question}\nA: ${item.response}`).join('\n\n'),
        userProfile
      );
      
      setFinalFeedback(feedback);
      
      // Speak the feedback
      const feedbackText = `Here's your overall interview feedback: ${feedback.contentFeedback} ${feedback.deliveryFeedback} ${feedback.improvementTips || ''}`;
      setCurrentSpeechText(feedbackText);
      
    } catch (error) {
      console.error("Error generating final feedback:", error);
      toast({
        title: "Error",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive"
      });
      setConversationState('complete');
    } finally {
      setIsGeneratingFinalFeedback(false);
    }
  };

  const handleRestartInterview = () => {
    // Reset all states to initial values
    setUserResponse('');
    setAllResponses([]);
    setFinalFeedback(null);
    setCurrentQuestionIndex(0);
    setInterviewComplete(false);
    setIsListening(false);
    setIsGeneratingFinalFeedback(false);
    setConversationState('greeting');
    
    // Clean up speech recognition
    if (speechRecognition) {
      speechRecognition.stop();
      setSpeechRecognition(null);
    }
    
    // Re-generate questions
    setIsGeneratingQuestions(true);
    generateQuestions(userProfile)
      .then(initialQuestions => {
        setQuestions(initialQuestions);
        setAllResponses(new Array(initialQuestions.length).fill(''));
        setIsGeneratingQuestions(false);
        
        const greeting = `Hello ${userProfile.name}, welcome to your AI interview session for the ${userProfile.role} position. I'll be asking you ${initialQuestions.length} questions today. Let's begin.`;
        setCurrentSpeechText(greeting);
      })
      .catch(error => {
        console.error("Error generating questions:", error);
        toast({
          title: "Error",
          description: "Failed to generate interview questions. Please try again.",
          variant: "destructive"
        });
        setIsGeneratingQuestions(false);
      });
  };

  const createSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    let finalTranscript = '';
    let isRecognitionActive = true;
    
    recognition.onstart = () => {
      console.log("Speech recognition started successfully");
      setIsListening(true);
      isRecognitionActive = true;
      toast({
        title: "Voice Input Active",
        description: "Speak now. Click the button again to stop recording.",
      });
    };
    
    recognition.onresult = (event: any) => {
      console.log("Speech recognition result received:", event);
      
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update the textarea with final + interim results
      const currentTranscript = finalTranscript + interimTranscript;
      if (currentTranscript.trim()) {
        setUserResponse(currentTranscript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      
      if (!isRecognitionActive) {
        return; // Ignore errors after manual stop
      }
      
      setIsListening(false);
      setSpeechRecognition(null);
      
      let errorMessage = "Voice input encountered an error.";
      let shouldRetry = false;
      
      switch (event.error) {
        case 'network':
          errorMessage = "Network connection issue. Please check your internet and try again.";
          shouldRetry = true;
          break;
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please allow microphone permissions and try again.";
          break;
        case 'no-speech':
          errorMessage = "No speech detected. Please try speaking again.";
          shouldRetry = true;
          break;
        case 'audio-capture':
          errorMessage = "No microphone found. Please check your audio devices.";
          break;
        case 'service-not-allowed':
          errorMessage = "Speech service not available. Please try using HTTPS or a different browser.";
          break;
        case 'aborted':
          // Don't show error for manual stops
          return;
        default:
          errorMessage = `Voice input error: ${event.error}. Please try again.`;
          shouldRetry = true;
      }
      
      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Auto-retry for network errors after a delay
      if (shouldRetry && event.error === 'network') {
        setTimeout(() => {
          if (!isListening) {
            toast({
              title: "Retrying Voice Input",
              description: "Attempting to reconnect...",
            });
            handleToggleMicrophone();
          }
        }, 2000);
      }
    };
    
    recognition.onend = () => {
      console.log("Speech recognition ended");
      
      if (isRecognitionActive && isListening) {
        // If recognition ended unexpectedly but we're still supposed to be listening, restart
        console.log("Recognition ended unexpectedly, restarting...");
        setTimeout(() => {
          if (isListening && speechRecognition) {
            try {
              recognition.start();
            } catch (error) {
              console.error("Failed to restart recognition:", error);
              setIsListening(false);
              setSpeechRecognition(null);
            }
          }
        }, 100);
      } else {
        setIsListening(false);
        setSpeechRecognition(null);
      }
    };
    
    // Store the stop function
    recognition.stopRecognition = () => {
      isRecognitionActive = false;
      recognition.stop();
    };
    
    return recognition;
  };

  const handleToggleMicrophone = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Check for browser support
    if (!speechSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
        variant: "destructive"
      });
      return;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error("Microphone permission denied:", error);
      toast({
        title: "Permission Required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive"
      });
      return;
    }

    try {
      const recognition = createSpeechRecognition();
      setSpeechRecognition(recognition);
      recognition.start();
      
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsListening(false);
      setSpeechRecognition(null);
      toast({
        title: "Error",
        description: "Could not start voice input. Please try again or use text input instead.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (speechRecognition && speechRecognition.stopRecognition) {
      speechRecognition.stopRecognition();
    }
    setIsListening(false);
    setSpeechRecognition(null);
    
    toast({
      title: "Voice Input Stopped",
      description: "You can continue typing or start voice input again.",
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (speechRecognition && speechRecognition.stopRecognition) {
        speechRecognition.stopRecognition();
      }
    };
  }, [speechRecognition]);

  const currentQuestion = questions[currentQuestionIndex];
  const isSpeakingNow = isSpeaking();

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* API Key Modal */}
      <ApiKeyModal onComplete={() => setShowApiKeyModal(false)} />

      {/* Avatar Section */}
      <div className="lg:col-span-2 flex flex-col justify-center items-center">
        <Card className="w-full aspect-square relative flex items-center justify-center shadow-lg">
          <Avatar 
            isSpeaking={isSpeakingNow} 
            mood={conversationState === 'finalFeedback' ? (finalFeedback?.positive ? 'positive' : 'neutral') : 'neutral'}
            text={currentSpeechText}
          />
        </Card>
        
        <div className="mt-4 w-full text-center">
          <p className="text-interview-secondary text-sm">
            Interview with AI Coach - {userProfile.field} - {userProfile.name}
          </p>
        </div>
      </div>

      {/* Q&A Section */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        {isGeneratingQuestions ? (
          <Card className="p-6 flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-pulse-subtle text-interview-primary">
                <p className="text-xl font-medium mb-2">Preparing your interview questions...</p>
                <p className="text-sm text-gray-600">
                  The AI is analyzing your profile to create personalized questions.
                </p>
              </div>
            </div>
          </Card>
        ) : interviewComplete ? (
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-interview-primary mb-4">Interview Complete!</h2>
            <p className="mb-6 text-gray-700">
              Congratulations {userProfile.name}! You've completed your mock interview for the {userProfile.role} position.
            </p>
            <Button 
              onClick={handleRestartInterview}
              className="bg-interview-primary hover:bg-interview-secondary"
            >
              Start a New Interview
            </Button>
          </Card>
        ) : conversationState === 'finalFeedback' ? (
          isGeneratingFinalFeedback ? (
            <Card className="p-6 flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-pulse-subtle text-interview-primary">
                  <p className="text-xl font-medium mb-2">Analyzing your interview performance...</p>
                  <p className="text-sm text-gray-600">
                    Generating comprehensive feedback on all your responses.
                  </p>
                </div>
              </div>
            </Card>
          ) : finalFeedback ? (
            <FeedbackPanel 
              feedback={finalFeedback} 
              onNext={() => setInterviewComplete(true)}
              isLastQuestion={true}
            />
          ) : null
        ) : (
          <>
            <QuestionPanel 
              question={currentQuestion?.question || "Loading question..."}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
            />

            <Card className="p-6">
              <Textarea 
                placeholder="Type your answer here..."
                className="min-h-[150px] mb-4"
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                disabled={conversationState !== 'asking'}
              />
              
              <div className="flex flex-wrap gap-3 justify-between">
                {speechSupportChecked && speechSupported && (
                  <Button 
                    variant={isListening ? "destructive" : "outline"}
                    onClick={handleToggleMicrophone}
                    type="button"
                    className="flex items-center gap-2"
                    disabled={conversationState !== 'asking'}
                  >
                    {isListening ? (
                      <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Stop Recording
                      </>
                    ) : (
                      'Use Voice Input'
                    )}
                  </Button>
                )}
                
                <Button 
                  onClick={handleSubmitResponse}
                  disabled={isLoading || !userResponse.trim() || conversationState !== 'asking'}
                  className="bg-interview-primary hover:bg-interview-secondary"
                >
                  {isLoading ? "Processing..." : "Submit Answer"}
                </Button>
              </div>
            </Card>
          </>
        )}
        
        <div className="text-sm text-gray-500 flex justify-between mt-2">
          <span>Interviewing for: {userProfile.role}</span>
          <span>Experience: {userProfile.experienceLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
