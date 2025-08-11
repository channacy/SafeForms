import React from 'react';
import { QuestionStatus } from '../types/dashboard.types';

interface ConfidenceIndicatorProps {
  question: QuestionStatus;
}

export function ConfidenceIndicator({ question }: ConfidenceIndicatorProps) {
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDecisionBadge = (decision?: string, confidence?: number) => {
    if (!decision) return null;
    
    const badgeClass = decision === 'answer' ? 'bg-green-100 text-green-800' :
                      decision === 'suggest' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
        {decision.toUpperCase()} • {Math.round((confidence || 0) * 100)}%
      </span>
    );
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {question.confidence !== undefined && (
        <span className={`text-sm font-medium ${getConfidenceColor(question.confidence)}`}>
          Confidence: {Math.round(question.confidence * 100)}%
        </span>
      )}
      {getDecisionBadge(question.decision, question.verification_conf)}
    </div>
  );
}
