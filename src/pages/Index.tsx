
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import UserProfileForm from '@/components/UserProfileForm';
import InterviewRoom from '@/components/InterviewRoom';
import { UserProfile } from '@/utils/interviewService';

const Index: React.FC = () => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleStartInterview = (profile: UserProfile) => {
    setUserProfile(profile);
    setInterviewStarted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-interview-light to-white">
      <main className="container mx-auto py-8 px-4">
        {!interviewStarted ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-4xl font-bold text-interview-primary mb-4">AI Interview Coach</h1>
              <p className="text-xl text-interview-secondary">
                Practice your interview skills with our AI-powered coach. Get personalized questions and feedback.
              </p>
            </div>
            
            <Card className="p-6 shadow-lg">
              <UserProfileForm onSubmit={handleStartInterview} />
            </Card>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Powered by Google Gemini AI · Your data is never stored permanently</p>
            </div>
          </div>
        ) : (
          <InterviewRoom userProfile={userProfile!} />
        )}
      </main>
    </div>
  );
};

export default Index;
