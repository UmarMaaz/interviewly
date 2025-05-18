
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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [conversationState, setConversationState] = useState<
    'greeting' | 'asking' | 'acknowledging' | 'feedback' | 'transition' | 'complete'
  >('greeting');
  
  // Generate initial questions
  useEffect(() => {
    const initInterview = async () => {
      try {
        setIsGeneratingQuestions(true);
        const initialQuestions = await generateQuestions(userProfile);
        setQuestions(initialQuestions);
        setIsGeneratingQuestions(false);
        setConversationState('greeting');
        
        // Set initial greeting text for the avatar to speak
        if (initialQuestions.length > 0) {
          const greeting = `Hello ${userProfile.name}, I'm your AI interview coach for the ${userProfile.role} position. I'll be asking you some questions today and providing feedback on your answers.`;
          setCurrentSpeechText(greeting);
        }
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

  // Manage conversation flow and speech based on state
  useEffect(() => {
    if (isGeneratingQuestions) return;
    
    // Set speech text based on conversation state
    switch (conversationState) {
      case 'greeting':
        if (questions.length > 0) {
          const greeting = `Hello ${userProfile.name}, I'm your AI interview coach for the ${userProfile.role} position. I'll be asking you some questions today and providing feedback on your answers.`;
          setCurrentSpeechText(greeting);
          
          // Move to asking state after the greeting is complete
          const checkSpeechComplete = setInterval(() => {
            if (!isSpeaking()) {
              clearInterval(checkSpeechComplete);
              setTimeout(() => {
                setConversationState('asking');
              }, 500);
            }
          }, 300);
        }
        break;
        
      case 'asking':
        if (questions.length > 0 && currentQuestionIndex < questions.length) {
          const currentQuestion = questions[currentQuestionIndex];
          setCurrentSpeechText(currentQuestion.question);
        }
        break;
        
      case 'acknowledging':
        // Just use the current acknowledgment text
        break;
        
      case 'feedback':
        if (isFeedbackMode && feedback) {
          const feedbackIntro = feedback.positive ? 
            "I appreciate your response. Here's some positive feedback: " : 
            "Thank you for your answer. Here's some constructive feedback: ";
            
          const feedbackText = `${feedbackIntro} ${feedback.contentFeedback} ${feedback.deliveryFeedback} ${feedback.improvementTips || ''}`;
          setCurrentSpeechText(feedbackText);
        }
        break;
        
      case 'transition':
        const transition = getTransitionPhrase();
        if (currentQuestionIndex < questions.length - 1) {
          const nextQuestion = questions[currentQuestionIndex + 1].question;
          setCurrentSpeechText(`${transition} ${nextQuestion}`);
        } else {
          setCurrentSpeechText(`${transition} That was our final question.`);
        }
        break;
        
      case 'complete':
        setCurrentSpeechText(`Congratulations ${userProfile.name}! You've completed your mock interview for the ${userProfile.role} position. I hope this practice session was helpful for your future interviews.`);
        break;
    }
  }, [
    conversationState, 
    questions, 
    currentQuestionIndex, 
    isFeedbackMode, 
    feedback, 
    isAcknowledging, 
    userProfile,
    isGeneratingQuestions
  ]);

  // Effect to handle speech and ensure completed speaking before moving to next state
  useEffect(() => {
    if (currentSpeechText) {
      speak(currentSpeechText);
    }
  }, [currentSpeechText]);

  const handleSubmitResponse = async () => {
    if (!userResponse.trim()) {
      toast({
        title: "Warning",
        description: "Please provide a response before submitting.",
        variant: "default"
      });
      return;
    }
    
    // Stop listening if it's active
    if (isListening) {
      stopListening();
    }
    
    // First, acknowledge the response with a conversational phrase
    setIsAcknowledging(true);
    setConversationState('acknowledging');
    const acknowledgment = getAcknowledgmentPhrase();
    setCurrentSpeechText(acknowledgment);
    
    // Wait until the acknowledgment speech is complete before analyzing
    const checkAcknowledgmentComplete = setInterval(() => {
      if (!isSpeaking()) {
        clearInterval(checkAcknowledgmentComplete);
        proceedWithFeedback();
      }
    }, 300);
    
    const proceedWithFeedback = () => {
      setIsAcknowledging(false);
      setIsLoading(true);
      
      // Get AI feedback on the response
      const currentQuestion = questions[currentQuestionIndex];
      getAIFeedback(
        currentQuestion.question, 
        userResponse, 
        userProfile
      ).then(responseFeedback => {
        setFeedback(responseFeedback);
        setIsFeedbackMode(true);
        setConversationState('feedback');
        setIsLoading(false);
      }).catch(error => {
        console.error("Error getting feedback:", error);
        toast({
          title: "Error",
          description: "Failed to analyze your response. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      });
    };
  };

  const handleNextQuestion = () => {
    // Wait for any current speech to finish first
    if (isSpeaking()) {
      stop();
    }
    
    setIsFeedbackMode(false);
    setUserResponse('');
    setFeedback(null);
    
    if (currentQuestionIndex < questions.length - 1) {
      // Add a conversational transition between questions
      setConversationState('transition');
      
      // Wait until the transition speech is complete before showing the next question
      const checkTransitionComplete = setInterval(() => {
        if (!isSpeaking()) {
          clearInterval(checkTransitionComplete);
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setConversationState('asking');
        }
      }, 300);
    } else {
      setInterviewComplete(true);
      setConversationState('complete');
    }
  };

  const handleToggleMicrophone = () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Check for browser compatibility
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Error",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }

    try {
      // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false; // Changed to false to prevent repeating words
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening",
          description: "Speak your answer now...",
        });
      };
      
      // Store previous transcripts to avoid repetition
      const previousTranscripts = new Set();
      
      recognition.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;
        
        // Prevent repetition by checking if we've seen this transcript
        if (!previousTranscripts.has(transcript)) {
          previousTranscripts.add(transcript);
          
          setUserResponse(prev => {
            // Add space only if there's existing content
            return prev ? `${prev} ${transcript}` : transcript;
          });
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        toast({
          title: "Error",
          description: `Speech recognition error: ${event.error}`,
          variant: "destructive"
        });
        setIsListening(false);
      };
      
      // Don't automatically end recognition
      recognition.onend = () => {
        // Instead of stopping listening, restart if still in listening mode
        // This prevents premature closing of voice input
        if (isListening) {
          try {
            recognition.start();
          } catch (error) {
            console.error("Error restarting speech recognition:", error);
            setIsListening(false);
          }
        }
      };
      
      // Store recognition instance in window to be able to stop it later
      (window as any).recognitionInstance = recognition;
      
      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast({
        title: "Error",
        description: "Could not start voice input. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if ((window as any).recognitionInstance) {
      (window as any).recognitionInstance.stop();
      toast({
        title: "Voice input stopped",
        description: "You can continue typing your answer.",
      });
      setIsListening(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isSpeaking = conversationState === 'greeting' || 
                     conversationState === 'asking' || 
                     conversationState === 'acknowledging' || 
                     (conversationState === 'feedback' && isFeedbackMode) || 
                     conversationState === 'transition' || 
                     conversationState === 'complete';

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* API Key Modal */}
      <ApiKeyModal onComplete={() => setShowApiKeyModal(false)} />

      {/* Avatar Section */}
      <div className="lg:col-span-2 flex flex-col justify-center items-center">
        <Card className="w-full aspect-square relative flex items-center justify-center shadow-lg">
          <Avatar 
            isSpeaking={isSpeaking} 
            mood={isFeedbackMode ? (feedback?.positive ? 'positive' : 'neutral') : 'neutral'}
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
        ) : isFeedbackMode ? (
          <FeedbackPanel 
            feedback={feedback!} 
            onNext={handleNextQuestion} 
            isLastQuestion={currentQuestionIndex === questions.length - 1}
          />
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
              />
              
              <div className="flex flex-wrap gap-3 justify-between">
                <Button 
                  variant={isListening ? "destructive" : "outline"}
                  onClick={handleToggleMicrophone}
                  type="button"
                  className="flex items-center gap-2"
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
                
                <Button 
                  onClick={handleSubmitResponse}
                  disabled={isLoading || !userResponse.trim()}
                  className="bg-interview-primary hover:bg-interview-secondary"
                >
                  {isLoading ? "Analyzing..." : "Submit Answer"}
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
