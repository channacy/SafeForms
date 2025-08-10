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
            <div className="mt-4 text-xs text-gray-700 flex items-center gap-3">
             <span className="font-semibold">Legend:</span>
             <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-green-100 text-green-800 border-green-300">ANSWER · 0.95</span>
             <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-orange-100 text-orange-800 border-orange-300">SUGGEST · 0.72</span>
            <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-red-100 text-red-800 border-red-300">FLAG · 0.30</span>
             <span className="ml-2 text-gray-500">(badge shows action and confidence)</span>
          </div>
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
