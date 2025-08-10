'use client';

import { QuestionResponse } from "../../components/layout/QuestionResponse"

interface Result {
  question: string;
  answer?: string;
  action?: string;
  model_confidence?: number;
}

export const AutoFillResults = ({ results }: { results: Result[] }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-2xl font-bold text-center mb-8">AI Autofilled Responses</h1>
          <p className="text-gray-600 text-center mb-8">
            Review the responses below. Low-confidence ones are highlighted.
          </p>
          <div className="space-y-6">
            {results.map((r, idx) => (
              <QuestionResponse
                key={idx}
                question={r.question}
                response={r.answer || ''}
                confidenceScore={Math.round((r.model_confidence ?? 0) * 100)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
