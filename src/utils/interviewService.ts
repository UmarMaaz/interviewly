
// This is a mock service for interview functionality
// In a real application, this would connect to the Google Gemini API

export interface UserProfile {
  name: string;
  field: string;
  role: string;
  experienceLevel: string;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
}

export interface Feedback {
  positive: boolean;
  contentFeedback: string;
  deliveryFeedback: string;
  improvementTips?: string;
}

// Mock function to generate questions based on user profile
export const generateQuestions = async (
  profile: UserProfile
): Promise<InterviewQuestion[]> => {
  // In a real app, this would use the Gemini API
  // For now, we'll return mock questions based on the profile
  
  console.log("Generating questions for profile:", profile);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let questions: InterviewQuestion[] = [];
  
  // Generate field-specific questions
  if (profile.field === "Software Engineering") {
    questions = [
      {
        id: 1,
        question: `Based on your experience as a ${profile.role}, tell me about a challenging project you worked on and how you approached it.`,
        category: "Experience"
      },
      {
        id: 2,
        question: "How do you stay updated with the latest technologies and tools in your field?",
        category: "Professional Development"
      },
      {
        id: 3,
        question: "Explain how you would handle a situation where you disagreed with a team member's technical approach.",
        category: "Teamwork"
      },
      {
        id: 4,
        question: "Describe your process for debugging a complex technical issue.",
        category: "Technical Skills"
      },
      {
        id: 5,
        question: "Where do you see yourself professionally in the next 3-5 years?",
        category: "Career Goals"
      }
    ];
  } else if (profile.field === "Marketing") {
    questions = [
      {
        id: 1,
        question: `Describe a marketing campaign you worked on that was particularly successful as a ${profile.role}.`,
        category: "Experience"
      },
      {
        id: 2,
        question: "How do you measure the success of your marketing initiatives?",
        category: "Analytics"
      },
      {
        id: 3,
        question: "Tell me about a time when a marketing campaign didn't meet expectations. What did you learn?",
        category: "Problem Solving"
      },
      {
        id: 4,
        question: "How do you stay current with changing marketing trends and technologies?",
        category: "Professional Development"
      },
      {
        id: 5,
        question: "Describe your approach to understanding a target audience for a new product.",
        category: "Strategy"
      }
    ];
  } else {
    // Generic questions for any field
    questions = [
      {
        id: 1,
        question: `Tell me about your background and experience related to the ${profile.role} position.`,
        category: "Experience"
      },
      {
        id: 2,
        question: "What are your greatest professional strengths and how do they help you in your work?",
        category: "Self-Assessment"
      },
      {
        id: 3,
        question: "Describe a challenging situation at work and how you handled it.",
        category: "Problem Solving"
      },
      {
        id: 4,
        question: "How do you prioritize your work when dealing with multiple deadlines?",
        category: "Time Management"
      },
      {
        id: 5,
        question: "Why are you interested in this particular role and company?",
        category: "Motivation"
      }
    ];
  }
  
  // Add experience level-specific question
  if (profile.experienceLevel.includes("Beginner")) {
    questions.push({
      id: 6,
      question: "What skills are you hoping to develop in this role?",
      category: "Growth"
    });
  } else if (profile.experienceLevel.includes("Senior")) {
    questions.push({
      id: 6,
      question: "How do you approach mentoring junior team members?",
      category: "Leadership"
    });
  }
  
  return questions;
};

// Mock function to get AI feedback on user responses
export const getAIFeedback = async (
  question: string,
  response: string,
  profile: UserProfile
): Promise<Feedback> => {
  // In a real app, this would use the Gemini API
  // For now, we'll provide mock feedback
  
  console.log("Getting feedback for response:", { question, response });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simple mock analysis
  const wordCount = response.split(' ').length;
  const hasSpecificExamples = response.includes("example") || response.includes("instance") || response.includes("situation");
  const usesConcreteFigures = /\d+%|\d+ years|\d+ projects/.test(response);
  
  // Determine if this is a "good" response based on simple heuristics
  const positive = wordCount > 30 && (hasSpecificExamples || usesConcreteFigures);
  
  if (positive) {
    return {
      positive: true,
      contentFeedback: "Your answer was detailed and relevant to the question. You provided good context and specific examples that highlight your experience.",
      deliveryFeedback: "Your response was well-structured and concise while being comprehensive.",
      improvementTips: wordCount > 100 
        ? "Your answer was thorough, but consider being a bit more concise in future responses."
        : undefined
    };
  } else {
    return {
      positive: false,
      contentFeedback: "Your answer could benefit from more specific examples and details related to your experience.",
      deliveryFeedback: wordCount < 20 
        ? "Your response was quite brief. Consider expanding on your points to give the interviewer more insight." 
        : "Try to structure your answer with a clear beginning, middle, and conclusion.",
      improvementTips: "Use the STAR method (Situation, Task, Action, Result) to structure your responses to behavioral questions."
    };
  }
};

// In a real application, you would implement these functions:

/*
export const connectToGeminiAPI = (apiKey: string) => {
  // Initialize the Gemini API client with the provided API key
};

export const generateQuestionsWithGemini = async (profile: UserProfile) => {
  // Use Gemini API to generate personalized interview questions
};

export const getGeminiFeedback = async (question: string, answer: string, profile: UserProfile) => {
  // Use Gemini API to analyze the answer and provide feedback
};

export const useSpeechRecognition = () => {
  // Implement Web Speech API for voice input
};

export const textToSpeech = (text: string) => {
  // Implement text-to-speech for avatar responses
};
*/
