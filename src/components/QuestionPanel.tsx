
import React from 'react';
import { Card } from '@/components/ui/card';

interface QuestionPanelProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  topic: string;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ 
  question, 
  questionNumber, 
  totalQuestions,
  topic
}) => {
  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
          {topic}
        </span>
      </div>
      
      <h3 className="text-xl font-semibold text-interview-primary">
        {question}
      </h3>
    </Card>
  );
};

export default QuestionPanel;
