import React from 'react';
import { BatchRun } from '../types/dashboard.types';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface ResultsStreamProps {
  batchRun: BatchRun | null;
  isConnected: boolean;
}

export function ResultsStream({ batchRun, isConnected }: ResultsStreamProps) {
  if (!batchRun) return null;

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return '';
    const endTime = end || new Date();
    const duration = Math.round((endTime.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <div className="space-y-4">
      {/* Run Status Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900">
            Batch Run: {batchRun.runId.substring(0, 8)}...
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live stream connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-blue-700">
          <span>
            {batchRun.isComplete ? 'Completed' : batchRun.isRunning ? 'Running' : 'Stopped'} • 
            {batchRun.questions.filter(q => q.status === 'answered').length} answered, 
            {batchRun.questions.filter(q => q.status === 'flagged').length} flagged
          </span>
          {batchRun.startedAt && (
            <span>Duration: {formatDuration(batchRun.startedAt, batchRun.completedAt)}</span>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {batchRun.questions.map((question, index) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900">Q{index + 1}</h4>
              <ConfidenceIndicator question={question} />
            </div>
            
            <p className="text-gray-700 mb-3">{question.text}</p>
            
            {question.answer && (
              <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-gray-800">{question.answer}</p>
              </div>
            )}
            
            {question.status === 'processing' && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
