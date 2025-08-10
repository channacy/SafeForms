'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../lib/api';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

interface QuestionStatus {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'answered' | 'flagged';
  confidence?: number;
  answer?: string;
}

interface BatchRun {
  sessionId: string;
  runId: string;
  questions: QuestionStatus[];
  isRunning: boolean;
  isComplete: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export default function Dashboard() {
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState('');
  const [batchRun, setBatchRun] = useState<BatchRun | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load persisted session ID
  useEffect(() => {
    const saved = localStorage.getItem('safeforms_session_id');
    if (saved && validateUuid(saved)) {
      setSessionId(saved);
    }
  }, []);

  // Save session ID to localStorage
  useEffect(() => {
    if (sessionId && validateUuid(sessionId)) {
      localStorage.setItem('safeforms_session_id', sessionId);
    }
  }, [sessionId]);

  const generateSessionId = () => {
    const newId = uuidv4();
    setSessionId(newId);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
  };

  const isValidSessionId = sessionId && validateUuid(sessionId);

  const startBatchRun = async () => {
    if (!isValidSessionId || !questions.trim()) return;

    const questionList = questions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .map(text => ({
        id: uuidv4(),
        text,
        status: 'pending' as const
      }));

    if (questionList.length === 0) return;

    try {
      // Start batch run
      console.log('Using API base URL:', API_BASE);
      const response = await fetch(`${API_BASE}/api/batch/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          questions: questionList.map(q => q.text)
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

      // Prefer backend-provided IDs so SSE events map correctly
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

      // Start SSE stream with the returned run_id
      startEventStream(runId);
    } catch (error) {
      console.error('Failed to start batch run:', error);
      setBatchRun(prev => prev ? { ...prev, isRunning: false } : null);
    }
  };

  const startEventStream = (runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/api/runs/${runId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent(data);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };
  };

  const handleStreamEvent = (event: any) => {
    setBatchRun(prev => {
      if (!prev) return null;

      const updatedQuestions = prev.questions.map(q => {
        if (event.question_id && q.id === event.question_id) {
          const payload = event.payload || {};
          if (event.stage === 'review') {
            const verConf = typeof payload.verification_conf === 'number' ? payload.verification_conf : undefined;
            return { ...q, status: 'processing' as QuestionStatus['status'], confidence: verConf ?? q.confidence };
          }
          if (event.stage === 'final') {
            const decision = payload.decision || 'needs_info';
            const verConf = typeof payload.verification_conf === 'number' ? payload.verification_conf : undefined;
            const ans = typeof payload.answer === 'string' ? payload.answer : '';
            return {
              ...q,
              status: (decision === 'answer' ? 'answered' : 'flagged') as QuestionStatus['status'],
              confidence: verConf,
              answer: ans,
            };
          }
          // answering / retrying / risk stages -> mark processing
          return { ...q, status: 'processing' as QuestionStatus['status'] };
        }
        return q;
      });

      const allComplete = updatedQuestions.every(q => q.status === 'answered' || q.status === 'flagged');
      
      return {
        ...prev,
        questions: updatedQuestions,
        isRunning: !allComplete,
        isComplete: allComplete,
        completedAt: allComplete ? new Date() : undefined
      };
    });
  };

  const exportReport = async (format: 'pdf' | 'json') => {
    if (!batchRun?.runId) return;

    try {
      const response = await fetch(`${API_BASE}/api/runs/${batchRun.runId}/export`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Export failed');

      const result = await response.json();
      if (result.pdf) {
        // Download the generated PDF
        const pdfResponse = await fetch(`${API_BASE}/${result.pdf}`);
        const blob = await pdfResponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safeforms-${batchRun.sessionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const emailReport = async () => {
    if (!batchRun?.sessionId) return;

    const answeredCount = batchRun.questions.filter(q => q.status === 'answered').length;
    const flaggedCount = batchRun.questions.filter(q => q.status === 'flagged').length;

    try {
      const response = await fetch(`${API_BASE}/api/email/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: batchRun.sessionId,
          subject: `SafeForms Batch Report - ${batchRun.sessionId}`,
          stats: {
            answered: answeredCount,
            flagged: flaggedCount,
            total: batchRun.questions.length
          }
        })
      });

      if (!response.ok) throw new Error('Email failed');
      const result = await response.json();
      alert(`Report emailed successfully to ${result.to?.join(', ') || 'configured recipients'}!`);
    } catch (error) {
      console.error('Email failed:', error);
      alert('Failed to email report');
    }
  };

  const getStatusBadge = (status: QuestionStatus['status'], confidence?: number) => {
    switch (status) {
      case 'answered':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">ANSWERED</span>;
      case 'flagged':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">FLAGGED</span>;
      case 'processing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">PROCESSING</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">PENDING</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">SafeForms Batch Dashboard</h1>

          {/* Session ID Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session ID (UUID v4)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter or generate a session ID"
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  sessionId && !validateUuid(sessionId) ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <button
                onClick={generateSessionId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate
              </button>
              {isValidSessionId && (
                <button
                  onClick={copySessionId}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  title="Copy Session ID"
                >
                  📋
                </button>
              )}
            </div>
            {sessionId && !validateUuid(sessionId) && (
              <p className="text-red-600 text-sm mt-1">Invalid UUID format</p>
            )}
          </div>

          {/* Questions Input Section */}
          {!batchRun && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Questions (one per line)
              </label>
              <textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="What is our data retention policy?&#10;How is data protected?&#10;What security measures are in place?"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  {questions.split('\n').filter(q => q.trim()).length} questions
                </p>
                <button
                  onClick={startBatchRun}
                  disabled={!isValidSessionId || !questions.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Start Batch Run
                </button>
              </div>
            </div>
          )}

          {/* Batch Run Status */}
          {batchRun && (
            <div className="space-y-6">
              {/* Run Header */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900">
                      Batch Run: {batchRun.sessionId}
                    </h2>
                    <p className="text-blue-700 text-sm">
                      {batchRun.isRunning ? 'Processing...' : 'Completed'} • 
                      {batchRun.questions.filter(q => q.status === 'answered').length} answered, 
                      {batchRun.questions.filter(q => q.status === 'flagged').length} flagged
                    </p>
                    {isConnected && (
                      <p className="text-green-600 text-sm">🟢 Live stream connected</p>
                    )}
                  </div>
                  {batchRun.isComplete && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportReport('pdf')}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => exportReport('json')}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={emailReport}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        📧 Email Report
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {batchRun.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                      {getStatusBadge(question.status, question.confidence)}
                    </div>
                    <p className="text-gray-900 mb-2">{question.text}</p>
                    {question.answer && (
                      <div className="bg-gray-50 border-l-4 border-blue-500 p-3 mt-2">
                        <p className="text-sm text-gray-700">{question.answer}</p>
                        {question.confidence !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence: {Math.round(question.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reset Button */}
              {batchRun.isComplete && (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setBatchRun(null);
                      setQuestions('');
                      if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                      }
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Start New Batch
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
