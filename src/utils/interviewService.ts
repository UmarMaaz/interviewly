// Interview service for connecting with Google Gemini API

import { toast } from "sonner";

// API Key - In a production app, this should be stored securely in environment variables 
// or retrieved from server-side for security
const GEMINI_API_KEY = "AIzaSyBcklilewKoMufw_r3zwlFgDqAzuUbujvs";
const GEMINI_MODEL = "models/gemini-1.5-flash";

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

/**
 * Makes a request to the Gemini API
 */
const callGeminiAPI = async (
  prompt: string,
  systemInstruction?: string
): Promise<any> => {
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    };

    // Add system instruction if provided
    if (systemInstruction) {
      requestBody.contents.unshift({
        role: "system",
        parts: [{ text: systemInstruction }]
      });
    }

    console.log("Sending request to Gemini API:", { prompt: prompt.substring(0, 100) + "..." });
    
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log("Gemini API response received:", data);
    
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedContent) {
      console.error("No content in Gemini response:", data);
      throw new Error("No content generated from Gemini API");
    }

    return generatedContent;
  } catch (error) {
    // Check for specific error types and provide more helpful messages
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("Gemini API request timed out after 15 seconds");
      toast.error("Gemini API request timed out. Using fallback questions instead.");
    } else {
      console.error("Error calling Gemini API:", error);
      toast.error("Error connecting to Gemini AI. Using fallback questions instead.");
    }
    throw error;
  }
};

// Generate questions based on user profile
export const generateQuestions = async (
  profile: UserProfile
): Promise<InterviewQuestion[]> => {
  console.log("Generating questions for profile:", profile);
  
  try {
    // First try to use Gemini
    const systemInstruction = `You are an expert interview coach helping to generate relevant interview questions. Create questions that would be asked in a real job interview for the role specified. Start with introductory questions and then progress to more specific role-related questions.`;
    
    const prompt = `Generate 8-10 interview questions for a ${profile.role} position in the ${profile.field} field for someone at the ${profile.experienceLevel} experience level.
    
    Make sure to include these sections in this exact order:
    1. Begin with 2-3 introductory questions (e.g., "Tell me about yourself", "Why are you interested in this role?", etc.)
    2. Add 2-3 questions about the candidate's experience and skills
    3. Include 2-3 technical or role-specific questions 
    4. End with 1-2 behavioral or situational questions
    
    Format your response as a JSON array with the following structure:
    [
      {
        "id": 1,
        "question": "Your first question here",
        "category": "Appropriate category (e.g., Introduction, Technical Skills, Experience, Problem Solving)"
      },
      ...and so on
    ]
    
    Don't include any explanations or additional text outside the JSON array.`;

    // Make up to 3 attempts to get a valid response from Gemini
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Gemini API attempt ${attempts + 1} of ${maxAttempts}`);
        const responseText = await callGeminiAPI(prompt, systemInstruction);
        
        // Find JSON in the response - looking for array between square brackets
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const questions = JSON.parse(jsonString);
          console.log(`Successfully generated ${questions.length} questions`);
          return questions;
        } else {
          console.error("Could not extract JSON from Gemini response:", responseText.substring(0, 200) + "...");
          throw new Error("Could not extract JSON from Gemini response");
        }
      } catch (error) {
        lastError = error;
        attempts++;
        console.warn(`Attempt ${attempts} failed:`, error);
        
        // Small delay between retries
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error(`All ${maxAttempts} attempts to Gemini API failed`, lastError);
    throw lastError || new Error("Failed after multiple attempts");
    
  } catch (error) {
    console.warn("Using fallback questions due to error:", error);
    toast.info("Using pre-defined interview questions");
    
    // Fallback to predefined questions with improved structure
    let questions: InterviewQuestion[] = [
      {
        id: 1,
        question: `Hello ${profile.name}, please tell me a bit about yourself and your background.`,
        category: "Introduction"
      },
      {
        id: 2,
        question: `Why are you interested in this ${profile.role} position?`,
        category: "Introduction"
      },
      {
        id: 3,
        question: `What motivated you to pursue a career in the ${profile.field} field?`,
        category: "Introduction"
      }
    ];
    
    // Add field-specific questions
    if (profile.field === "Software Engineering") {
      questions = [...questions,
        {
          id: 4,
          question: `Based on your experience as a ${profile.role}, tell me about a challenging project you worked on and how you approached it.`,
          category: "Experience"
        },
        {
          id: 5,
          question: "How do you stay updated with the latest technologies and tools in your field?",
          category: "Professional Development"
        },
        {
          id: 6,
          question: "Explain how you would handle a situation where you disagreed with a team member's technical approach.",
          category: "Teamwork"
        },
        {
          id: 7,
          question: "Describe your process for debugging a complex technical issue.",
          category: "Technical Skills"
        },
        {
          id: 8,
          question: "What programming languages or frameworks are you most comfortable with, and why?",
          category: "Technical Skills"
        },
        {
          id: 9,
          question: "Where do you see yourself professionally in the next 3-5 years?",
          category: "Career Goals"
        },
        {
          id: 10,
          question: "Tell me about a time when you had to meet a tight deadline. How did you manage your time and resources?",
          category: "Problem Solving"
        }
      ];
    } else if (profile.field === "Marketing") {
      questions = [...questions,
        {
          id: 4,
          question: `Describe a marketing campaign you worked on that was particularly successful as a ${profile.role}.`,
          category: "Experience"
        },
        {
          id: 5,
          question: "How do you measure the success of your marketing initiatives?",
          category: "Analytics"
        },
        {
          id: 6,
          question: "Tell me about a time when a marketing campaign didn't meet expectations. What did you learn?",
          category: "Problem Solving"
        },
        {
          id: 7,
          question: "How do you stay current with changing marketing trends and technologies?",
          category: "Professional Development"
        },
        {
          id: 8,
          question: "Describe your approach to understanding a target audience for a new product.",
          category: "Strategy"
        },
        {
          id: 9,
          question: "What marketing tools and platforms are you most experienced with?",
          category: "Technical Skills"
        },
        {
          id: 10,
          question: "Tell me about how you've collaborated with other teams, such as sales or product development.",
          category: "Teamwork"
        }
      ];
    } else {
      // Generic questions for any field
      questions = [...questions,
        {
          id: 4,
          question: `Tell me more specifically about your background and experience related to the ${profile.role} position.`,
          category: "Experience"
        },
        {
          id: 5,
          question: "What are your greatest professional strengths and how do they help you in your work?",
          category: "Self-Assessment"
        },
        {
          id: 6,
          question: "Describe a challenging situation at work and how you handled it.",
          category: "Problem Solving"
        },
        {
          id: 7,
          question: "How do you prioritize your work when dealing with multiple deadlines?",
          category: "Time Management"
        },
        {
          id: 8,
          question: "What tools or methodologies are you familiar with that relate to this role?",
          category: "Technical Skills"
        },
        {
          id: 9,
          question: "Describe a time when you had to adapt to a significant change at work.",
          category: "Adaptability"
        },
        {
          id: 10,
          question: "Why are you interested in this particular role and company?",
          category: "Motivation"
        }
      ];
    }
    
    // Add experience level-specific question
    if (profile.experienceLevel.includes("Beginner")) {
      questions.push({
        id: 11,
        question: "What skills are you hoping to develop in this role?",
        category: "Growth"
      });
    } else if (profile.experienceLevel.includes("Senior")) {
      questions.push({
        id: 11,
        question: "How do you approach mentoring junior team members?",
        category: "Leadership"
      });
      questions.push({
        id: 12,
        question: "Tell me about a time when you had to make a difficult decision as a leader.",
        category: "Leadership"
      });
    }
    
    return questions;
  }
};

// Get AI feedback on user responses
export const getAIFeedback = async (
  question: string,
  response: string,
  profile: UserProfile
): Promise<Feedback> => {
  console.log("Getting feedback for response:", { question, response: response.substring(0, 50) + "..." });
  
  try {
    // First try to use Gemini for feedback
    const systemInstruction = `You are an expert interview coach providing feedback on interview responses. Assess the response for clarity, relevance, structure, and use of specific examples.`;
    
    const prompt = `Question: "${question}"
    
    Response: "${response}"
    
    Analyze this interview response for a ${profile.role} position in ${profile.field} at the ${profile.experienceLevel} experience level.
    
    Format your response as a JSON object with the following structure:
    {
      "positive": boolean (true if the response is generally good, false if needs significant improvement),
      "contentFeedback": "Feedback on the content and relevance of the answer",
      "deliveryFeedback": "Feedback on how the answer was structured and communicated",
      "improvementTips": "Specific suggestions for improving the response (optional)"
    }
    
    Be constructive but honest in your feedback. Don't include any explanations or additional text outside the JSON object.`;

    // Make up to 2 attempts to get a valid response for feedback
    let attempts = 0;
    const maxAttempts = 2;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Gemini API feedback attempt ${attempts + 1} of ${maxAttempts}`);
        const responseText = await callGeminiAPI(prompt, systemInstruction);
        
        // Find JSON in the response - looking for object between curly braces
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const feedback = JSON.parse(jsonString);
          return feedback;
        } else {
          throw new Error("Could not extract JSON from Gemini response");
        }
      } catch (error) {
        lastError = error;
        attempts++;
        
        // Small delay between retries
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw lastError || new Error("Failed to get feedback after multiple attempts");
    
  } catch (error) {
    console.warn("Using fallback feedback due to error:", error);
    toast.info("Using AI feedback unavailable. Using fallback evaluation.");
    
    // Simple mock analysis as fallback
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
  }
};

// Speech recognition functionality
export const startSpeechRecognition = () => {
  // Check if browser supports speech recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    toast.info("Voice input feature coming soon!");
    return false;
  } else {
    toast.error("Your browser doesn't support speech recognition.");
    return false;
  }
};
