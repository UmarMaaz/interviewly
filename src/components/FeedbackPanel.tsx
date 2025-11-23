
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Feedback } from '@/utils/interviewService';

interface FeedbackPanelProps {
  feedback: Feedback;
  onNext: () => void;
  isLastQuestion: boolean;
  isSpeaking: boolean;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  feedback,
  onNext,
  isLastQuestion,
  isSpeaking
}) => {
  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <span className={`font-medium ${feedback.positive ? 'text-green-600' : 'text-yellow-600'}`}>
          {feedback.positive ? 'Good response!' : 'Needs improvement'}
        </span>
        <span className="text-xs bg-interview-light text-interview-primary px-2 py-1 rounded-full">
          Feedback
        </span>
      </div>
      
      <h3 className="text-xl font-semibold text-interview-primary mb-4">
        Feedback Summary
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Content</h4>
          <p className="text-gray-800">{feedback.contentFeedback}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Delivery</h4>
          <p className="text-gray-800">{feedback.deliveryFeedback}</p>
        </div>
        
        {feedback.improvementTips && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Tips for Improvement</h4>
            <p className="text-gray-800">{feedback.improvementTips}</p>
          </div>
        )}

        {feedback.followUpQuestion && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Follow-up Question</h4>
            <p className="text-gray-800">{feedback.followUpQuestion}</p>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <Button 
          onClick={onNext}
          className="bg-interview-primary hover:bg-interview-secondary w-full"
          disabled={isSpeaking}
        >
          {isLastQuestion ? "Complete Interview" : "Next Question"}
        </Button>
      </div>
    </Card>
  );
};
export default FeedbackPanel;
