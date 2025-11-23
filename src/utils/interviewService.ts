// Interview service for connecting with Google Gemini API

import { toast } from "sonner";

// API Key - In a production app, this should be stored securely in environment variables 
// or retrieved from server-side for security
const GEMINI_API_KEY = "AIzaSyCZ1YyKplnPKffH9h0Tre6N6YcHbYcMthA";
const GEMINI_MODEL = "models/gemini-2.5-flash-lite";

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
  topic: string;
}

export interface Feedback {
  positive: boolean;
  contentFeedback: string;
  deliveryFeedback: string;
  improvementTips?: string;
  followUpQuestion?: string;
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
    
    // Instead of using system role (which is not supported), 
    // include the system instruction in the user prompt if provided
    let fullPrompt = prompt;
    if (systemInstruction) {
      fullPrompt = `${systemInstruction}\n\n${prompt}`;
    }
    
    const requestBody: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    };

    console.log("Sending request to Gemini API:", { prompt: fullPrompt.substring(0, 100) + "..." });
    
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
    const systemInstruction = `You are an expert interview coach helping to generate relevant and varied interview questions. Create questions that would be asked in a real job interview for the role specified. The questions should cover a range of topics and skills relevant to the candidate's profile.`;
    
    const prompt = `Generate 8-10 interview questions for a ${profile.role} position in the ${profile.field} field for someone at the ${profile.experienceLevel} experience level.

    **Instructions:**
    1.  **Variety is key:** Generate a mix of question types:
        *   **Behavioral:** Ask about past experiences (e.g., "Tell me about a time...").
        *   **Situational:** Pose hypothetical scenarios (e.g., "What would you do if...").
        *   **Technical:** Test their knowledge and skills specific to the role and field.
        *   **Cultural Fit:** Assess their personality and work style.
    2.  **Avoid cliché questions:** Do not use overly common questions like "What is your greatest weakness?".
    3.  **Organize by topic:** Group the questions into relevant topics.
    4.  **JSON Format:** Format your response as a JSON array with the following structure for each question:
        
        \`\`\`json
        [
          {
            "id": 1,
            "question": "Your unique and insightful question here.",
            "category": "Behavioral", // or Situational, Technical, Cultural Fit
            "topic": "A relevant topic like 'Teamwork', 'Problem Solving', 'Data Structures', 'Marketing Analytics', etc."
          }
        ]
        \`\`\`

    **Example for a Senior Software Engineer:**
    \`\`\`json
    [
      {
        "id": 1,
        "question": "Tell me about a time you had to mentor a junior engineer. What was your approach and what was the outcome?",
        "category": "Behavioral",
        "topic": "Leadership and Mentoring"
      },
      {
        "id": 2,
        "question": "Imagine you're tasked with designing a new, scalable microservice. What are the first three things you would consider?",
        "category": "Situational",
        "topic": "System Design"
      }
    ]
    \`\`\`

    **Important:** Do not include any explanations or additional text outside the JSON array. The response must be a valid JSON array.`;

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
        category: "Introduction",
        topic: "Getting to know you"
      },
      {
        id: 2,
        question: `Why are you interested in this ${profile.role} position?`,
        category: "Introduction",
        topic: "Motivation"
      },
      {
        id: 3,
        question: `What motivated you to pursue a career in the ${profile.field} field?`,
        category: "Introduction",
        topic: "Career Path"
      }
    ];
    
    // Add field-specific questions
    if (profile.field === "Software Engineering") {
      questions = [...questions,
        {
          id: 4,
          question: `Based on your experience as a ${profile.role}, tell me about a challenging project you worked on and how you approached it.`,
          category: "Experience",
          topic: "Project Experience"
        },
        {
          id: 5,
          question: "How do you stay updated with the latest technologies and tools in your field?",
          category: "Professional Development",
          topic: "Continuous Learning"
        },
        {
          id: 6,
          question: "Explain how you would handle a situation where you disagreed with a team member's technical approach.",
          category: "Teamwork",
          topic: "Conflict Resolution"
        },
        {
          id: 7,
          question: "Describe your process for debugging a complex technical issue.",
          category: "Technical Skills",
          topic: "Debugging"
        },
        {
          id: 8,
          question: "What programming languages or frameworks are you most comfortable with, and why?",
          category: "Technical Skills",
          topic: "Tech Stack"
        },
        {
          id: 9,
          question: "Where do you see yourself professionally in the next 3-5 years?",
          category: "Career Goals",
          topic: "Future Plans"
        },
        {
          id: 10,
          question: "Tell me about a time when you had to meet a tight deadline. How did you manage your time and resources?",
          category: "Problem Solving",
          topic: "Time Management"
        }
      ];
    } else if (profile.field === "Marketing") {
      questions = [...questions,
        {
          id: 4,
          question: `Describe a marketing campaign you worked on that was particularly successful as a ${profile.role}.`,
          category: "Experience",
          topic: "Campaign Success"
        },
        {
          id: 5,
          question: "How do you measure the success of your marketing initiatives?",
          category: "Analytics",
          topic: "Metrics and KPIs"
        },
        {
          id: 6,
          question: "Tell me about a time when a marketing campaign didn't meet expectations. What did you learn?",
          category: "Problem Solving",
          topic: "Learning from Failure"
        },
        {
          id: 7,
          question: "How do you stay current with changing marketing trends and technologies?",
          category: "Professional Development",
          topic: "Industry Trends"
        },
        {
          id: 8,
          question: "Describe your approach to understanding a target audience for a new product.",
          category: "Strategy",
          topic: "Audience Research"
        },
        {
          id: 9,
          question: "What marketing tools and platforms are you most experienced with?",
          category: "Technical Skills",
          topic: "Marketing Tools"
        },
        {
          id: 10,
          question: "Tell me about how you've collaborated with other teams, such as sales or product development.",
          category: "Teamwork",
          topic: "Cross-functional Collaboration"
        }
      ];
    } else {
      // Generic questions for any field
      questions = [...questions,
        {
          id: 4,
          question: `Tell me more specifically about your background and experience related to the ${profile.role} position.`,
          category: "Experience",
          topic: "Relevant Experience"
        },
        {
          id: 5,
          question: "What are your greatest professional strengths and how do they help you in your work?",
          category: "Self-Assessment",
          topic: "Strengths"
        },
        {
          id: 6,
          question: "Describe a challenging situation at work and how you handled it.",
          category: "Problem Solving",
          topic: "Challenge Resolution"
        },
        {
          id: 7,
          question: "How do you prioritize your work when dealing with multiple deadlines?",
          category: "Time Management",
          topic: "Prioritization"
        },
        {
          id: 8,
          question: "What tools or methodologies are you familiar with that relate to this role?",
          category: "Technical Skills",
          topic: "Tools and Methodologies"
        },
        {
          id: 9,
          question: "Describe a time when you had to adapt to a significant change at work.",
          category: "Adaptability",
          topic: "Handling Change"
        },
        {
          id: 10,
          question: "Why are you interested in this particular role and company?",
          category: "Motivation",
          topic: "Company Fit"
        }
      ];
    }
    
    // Add experience level-specific question
    if (profile.experienceLevel.includes("Beginner")) {
      questions.push({
        id: 11,
        question: "What skills are you hoping to develop in this role?",
        category: "Growth",
        topic: "Skill Development"
      });
    } else if (profile.experienceLevel.includes("Senior")) {
      questions.push({
        id: 11,
        question: "How do you approach mentoring junior team members?",
        category: "Leadership",
        topic: "Mentorship"
      });
      questions.push({
        id: 12,
        question: "Tell me about a time when you had to make a difficult decision as a leader.",
        category: "Leadership",
        topic: "Decision Making"
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
    const systemInstruction = `You are a human interviewer. Your name is 'Alex'. Be friendly, conversational, and engaging. Your goal is to make the candidate feel comfortable while still assessing their skills.`;
    
    const prompt = `You are 'Alex', a human interviewer. You are interviewing a candidate for a ${profile.role} position in the ${profile.field} field. The candidate is at the ${profile.experienceLevel} experience level.

    Your previous question was: "${question}"
    The candidate's response was: "${response}"

    Now, do the following:
    1.  **React like a human.** Start with a natural, conversational reaction to their response. If it's a good answer, show appreciation in a unique way (e.g., "That's a great example," "I like how you handled that," "Impressive!"). If the answer is weak, be encouraging but ask for more detail (e.g., "Thanks for sharing. Could you elaborate on...?", "That's a good start. Can you give me a specific example?").
    2.  **Provide constructive feedback.** Briefly mention one thing they did well and one area for improvement. Frame it as helpful advice.
    3.  **Ask a follow-up question.** Based on their response, ask a relevant follow-up question to dig deeper into their experience or thought process. This should feel like a natural part of the conversation.

    Format your entire response as a JSON object with the following structure:
    {
      "positive": boolean (true if the response was generally good),
      "contentFeedback": "Your conversational reaction and feedback on the content.",
      "deliveryFeedback": "Feedback on the delivery and communication style.",
      "improvementTips": "A specific suggestion for improvement.",
      "followUpQuestion": "Your follow-up question."
    }
    
    **Example of a good response:**
    {
      "positive": true,
      "contentFeedback": "Thanks, that's a fantastic example of your problem-solving skills. I liked how you took initiative to resolve the conflict with your team member.",
      "deliveryFeedback": "You explained the situation clearly and concisely.",
      "improvementTips": "To make it even stronger, you could quantify the impact of your actions. For example, did it improve team morale or project timelines?",
      "followUpQuestion": "You mentioned using a new framework. Could you tell me more about why you chose that particular one?"
    }

    **Example of a response to a weak answer:**
    {
      "positive": false,
      "contentFeedback": "Thanks for sharing that. It's a good start. I'd love to hear more about a specific situation where you had to use that skill.",
      "deliveryFeedback": "Your answer was a little brief. Try to add more detail to your responses.",
      "improvementTips": "When answering behavioral questions, using the STAR method (Situation, Task, Action, Result) can help you structure your thoughts.",
      "followUpQuestion": "Can you walk me through a project where you had to manage multiple deadlines?"
    }

    **Important:** Your response must be a valid JSON object. Do not include any text outside of the JSON structure.`;

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
          : undefined,
        followUpQuestion: "Can you tell me more about the technologies you used in that project?"
      };
    } else {
      return {
        positive: false,
        contentFeedback: "Your answer could benefit from more specific examples and details related to your experience.",
        deliveryFeedback: wordCount < 20 
          ? "Your response was quite brief. Consider expanding on your points to give the interviewer more insight." 
          : "Try to structure your answer with a clear beginning, middle, and conclusion.",
        improvementTips: "Use the STAR method (Situation, Task, Action, Result) to structure your responses to behavioral questions.",
        followUpQuestion: "Can you give me an example of a time you faced a similar challenge?"
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
