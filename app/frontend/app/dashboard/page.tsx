'use client';

import React from 'react';
import { useSessionPersistence } from './hooks/useSessionPersistence';
import { useBatchRun } from './hooks/useBatchRun';
import { SessionManager } from './components/SessionManager';
import { QuestionInput } from './components/QuestionInput';
import { ResultsStream } from './components/ResultsStream';
import { ExportActions } from './components/ExportActions';
import { ReportActions } from './components/ReportActions';

export default function Dashboard() {
  const {
    sessionId,
    generateSessionId,
    copySessionId,
    isValidSessionId
  } = useSessionPersistence();

  const {
    batchRun,
    isConnected,
    startBatchRun,
    stopBatchRun,
    clearBatchRun
  } = useBatchRun({ sessionId });

  const handleStartBatch = async (questions: string[]) => {
    try {
      await startBatchRun(questions);
    } catch (error) {
      console.error('Failed to start batch run:', error);
      alert('Failed to start batch run. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SafeForms Dashboard</h1>
          {batchRun && (
            <div className="flex gap-2">
              {batchRun.isRunning && (
                <button
                  onClick={stopBatchRun}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Stop Run
                </button>
              )}
              <button
                onClick={clearBatchRun}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Results
              </button>
            </div>
          )}
        </div>
        
        <SessionManager
          sessionId={sessionId}
          onGenerateSession={generateSessionId}
          onCopySession={copySessionId}
          isValid={isValidSessionId}
        />

        <QuestionInput
          onSubmit={handleStartBatch}
          isRunning={batchRun?.isRunning || false}
          isValidSession={isValidSessionId}
        />

        <ResultsStream
          batchRun={batchRun}
          isConnected={isConnected}
        />

        <ReportActions batchRun={batchRun} />

        <ExportActions batchRun={batchRun} />
      </div>
    </div>
  );
}
