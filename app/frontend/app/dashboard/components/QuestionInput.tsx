import React, { useState } from 'react';

interface QuestionInputProps {
  onSubmit: (questions: string[]) => void;
  isRunning: boolean;
  isValidSession: boolean;
}

export function QuestionInput({ onSubmit, isRunning, isValidSession }: QuestionInputProps) {
  const [questions, setQuestions] = useState('');

  const handleSubmit = () => {
    if (!isValidSession || !questions.trim() || isRunning) return;

    const questionList = questions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (questionList.length === 0) return;

    onSubmit(questionList);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Questions (one per line)
      </label>
      <textarea
        value={questions}
        onChange={(e) => setQuestions(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your questions here, one per line..."
        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
        disabled={isRunning}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-500">
          {questions.split('\n').filter(q => q.trim()).length} questions
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isValidSession || !questions.trim() || isRunning}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Processing...' : 'Start Batch Run'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Tip: Press Cmd/Ctrl + Enter to submit
      </p>
    </div>
  );
}
