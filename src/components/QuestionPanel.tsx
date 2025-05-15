
import React from 'react';
import { Card } from '@/components/ui/card';

interface QuestionPanelProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ 
  question, 
  questionNumber, 
  totalQuestions 
}) => {
  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="text-xs bg-interview-light text-interview-primary px-2 py-1 rounded-full">
          Current Question
        </span>
      </div>
      
      <h3 className="text-xl font-semibold text-interview-primary">
        {question}
      </h3>
    </Card>
  );
};

export default QuestionPanel;
