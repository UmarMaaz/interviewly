
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/Avatar';
import QuestionPanel from '@/components/QuestionPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import { UserProfile, generateQuestions, getAIFeedback, InterviewQuestion, Feedback } from '@/utils/interviewService';
import { getAcknowledgmentPhrase } from '@/utils/textToSpeech';

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
  
  // Generate initial questions
  useEffect(() => {
    const initInterview = async () => {
      try {
        setIsGeneratingQuestions(true);
        const initialQuestions = await generateQuestions(userProfile);
        setQuestions(initialQuestions);
        setIsGeneratingQuestions(false);
        
        // Set initial greeting text for the avatar to speak
        if (initialQuestions.length > 0) {
          const greeting = `Hello ${userProfile.name}, I'm your AI interview coach for the ${userProfile.role} position. Let's begin with the first question: ${initialQuestions[0].question}`;
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

  // When the current question changes, update the speech text
  useEffect(() => {
    if (!isGeneratingQuestions && questions.length > 0 && !isFeedbackMode && !interviewComplete) {
      const currentQuestion = questions[currentQuestionIndex];
      setCurrentSpeechText(currentQuestion.question);
    }
  }, [currentQuestionIndex, questions, isGeneratingQuestions, isFeedbackMode, interviewComplete]);

  // When feedback is received, make the avatar speak the feedback
  useEffect(() => {
    if (isFeedbackMode && feedback) {
      const feedbackText = `${feedback.positive ? 'Good job!' : 'Let\'s improve that answer.'} ${feedback.contentFeedback} ${feedback.deliveryFeedback} ${feedback.improvementTips || ''}`;
      setCurrentSpeechText(feedbackText);
    }
  }, [isFeedbackMode, feedback]);

  // When interview completes, have avatar say goodbye
  useEffect(() => {
    if (interviewComplete) {
      setCurrentSpeechText(`Congratulations ${userProfile.name}! You've completed your mock interview for the ${userProfile.role} position. I hope this practice session was helpful for your future interviews.`);
    }
  }, [interviewComplete, userProfile]);

  const handleSubmitResponse = async () => {
    if (!userResponse.trim()) {
      toast({
        title: "Warning",
        description: "Please provide a response before submitting.",
        variant: "warning"
      });
      return;
    }
    
    // First, acknowledge the response with a conversational phrase
    setIsAcknowledging(true);
    const acknowledgment = getAcknowledgmentPhrase();
    setCurrentSpeechText(acknowledgment);
    
    // Short delay to let the acknowledgment be spoken before showing loading state
    setTimeout(() => {
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
    }, 1500); // Allow time for the acknowledgment to be spoken
  };

  const handleNextQuestion = () => {
    setIsFeedbackMode(false);
    setUserResponse('');
    setFeedback(null);
    
    if (currentQuestionIndex < questions.length - 1) {
      // Add a conversational transition between questions
      const transitionPhrases = [
        "Let's move on to the next question.",
        "Now, let's continue with the next topic.",
        "Great, let's proceed to the next question.",
        "Moving forward to our next question.",
        "Let's explore another aspect of your experience."
      ];
      
      const transition = transitionPhrases[Math.floor(Math.random() * transitionPhrases.length)];
      setCurrentSpeechText(transition);
      
      // Short delay before showing the next question
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 1500);
    } else {
      setInterviewComplete(true);
    }
  };

  const handleRestartInterview = () => {
    window.location.reload();
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
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening",
          description: "Speak your answer now...",
        });
      };
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setUserResponse(transcript);
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
      
      recognition.onend = () => {
        setIsListening(false);
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

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Avatar Section */}
      <div className="lg:col-span-2 flex flex-col justify-center items-center">
        <Card className="w-full aspect-square relative flex items-center justify-center shadow-lg">
          <Avatar 
            isSpeaking={!isFeedbackMode && !isGeneratingQuestions || (isFeedbackMode && !!feedback) || isAcknowledging} 
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
