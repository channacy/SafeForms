import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE } from '../../../lib/api';
import { BatchRun, QuestionStatus, SSEEvent } from '../types/dashboard.types';
import { useSSEStream } from './useSSEStream';

interface UseBatchRunProps {
  sessionId: string;
}

export function useBatchRun({ sessionId }: UseBatchRunProps) {
  const [batchRun, setBatchRun] = useState<BatchRun | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleStreamEvent = useCallback((event: SSEEvent) => {
    setBatchRun(prev => {
      if (!prev) return null;

      switch (event.type) {
        case 'question_update':
          if (!event.question_id) return prev;
          
          const updatedQuestions = prev.questions.map(q => 
            q.id === event.question_id 
              ? {
                  ...q,
                  status: event.status || q.status,
                  confidence: event.confidence ?? q.confidence,
                  answer: event.answer ?? q.answer,
                  decision: event.decision as any ?? q.decision,
                  verification_conf: event.verification_conf ?? q.verification_conf
                }
              : q
          );

          return { ...prev, questions: updatedQuestions };

        case 'run_complete':
          const stats = {
            answered: prev.questions.filter(q => q.status === 'answered').length,
            suggested: prev.questions.filter(q => q.decision === 'suggest').length,
            flagged: prev.questions.filter(q => q.status === 'flagged').length
          };

          return {
            ...prev,
            isRunning: false,
            isComplete: true,
            completedAt: new Date(),
            stats
          };

        case 'error':
          console.error('Stream error:', event.error);
          return { ...prev, isRunning: false };

        default:
          return prev;
      }
    });
  }, []);

  const { startStream, stopStream } = useSSEStream({
    onEvent: handleStreamEvent,
    onConnectionChange: setIsConnected,
    onError: (error) => {
      console.error('[BatchRun] SSE Error:', error);
      setBatchRun(prev => prev ? { ...prev, error: error.message } : null);
    }
  });

  const startBatchRun = useCallback(async (questions: string[]) => {
    if (!sessionId || questions.length === 0) return;

    const questionList: QuestionStatus[] = questions.map(text => ({
      id: uuidv4(),
      text,
      status: 'pending'
    }));

    try {
      console.log('Starting batch run with API base:', API_BASE);
      const response = await fetch(`${API_BASE}/api/batch/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          questions: questions
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Batch run failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to start batch run: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const runId: string = result.run_id;
      const serverQuestions: Array<{ id: string; text: string }> = result.questions || [];

      // Use server-provided question IDs for SSE correlation
      const questionsWithServerIds: QuestionStatus[] = (serverQuestions.length ? serverQuestions : questionList).map((q: any) => ({
        id: q.id,
        text: q.text,
        status: 'pending' as const,
      }));

      const newBatchRun: BatchRun = {
        sessionId,
        runId,
        questions: questionsWithServerIds,
        isRunning: true,
        isComplete: false,
        startedAt: new Date()
      };

      setBatchRun(newBatchRun);
      // Start SSE stream for this batch run
      startStream({ sessionId: runId, debug: process.env.NODE_ENV === 'development' });

    } catch (error) {
      console.error('Failed to start batch run:', error);
      setBatchRun(prev => prev ? { ...prev, isRunning: false } : null);
      throw error;
    }
  }, [sessionId, startStream]);

  const stopBatchRun = useCallback(() => {
    stopStream();
    setBatchRun(prev => prev ? { ...prev, isRunning: false } : null);
  }, [stopStream]);

  const clearBatchRun = useCallback(() => {
    stopStream();
    setBatchRun(null);
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    batchRun,
    isConnected,
    startBatchRun,
    stopBatchRun,
    clearBatchRun
  };
}
