'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from "../../components/layout/Navbar";
import { health, askWithHistory, sendCompletion, upsertSuggestions } from "../../../lib/api";

export default function AIFillPage() {
  const [text, setText] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [asking, setAsking] = useState(false);
  const [email1, setEmail1] = useState('');
  const [email2, setEmail2] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [completionSubject, setCompletionSubject] = useState('Job Completed');
  const [completionPreface, setCompletionPreface] = useState('Accepted AI suggestions are included below.');
  const [answer, setAnswer] = useState<null | { best_policy: string; confidence: number; engine: string }>(null);
  const [results, setResults] = useState<{
    question: string;
    best_policy: string;
    confidence: number;
    engine: string;
    answer?: string;
    llm_engine?: string;
    action?: 'answer' | 'suggest' | 'flag';
    model_confidence?: number;
    confidence_reasoning?: string;
    sources?: string[];
  }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content (expand downwards only)
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Reset height to calculate new height
      textarea.style.height = 'auto';
      
      // Calculate the required height
      const scrollHeight = textarea.scrollHeight;
      const minHeight = window.innerHeight * 0.4; // 40vh in pixels
      const maxHeight = window.innerHeight * 0.7; // 70vh in pixels
      
      // Set height within bounds, ensuring it expands downwards
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
    }
  }, [text]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Main content area */}
      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
        <div className="w-full max-w-4xl">
          {/* Recipients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient 1</label>
              <input
                type="email"
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
                placeholder="alice@example.com"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient 2</label>
              <input
                type="email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                placeholder="bob@example.com"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>

          {/* Session & Email controls (no progress fields) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="run-20250809-001"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Completion Subject</label>
              <input
                type="text"
                value={completionSubject}
                onChange={(e) => setCompletionSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Completion Preface</label>
              <textarea
                value={completionPreface}
                onChange={(e) => setCompletionPreface(e.target.value)}
                className="w-full h-20 p-3 border rounded-md text-sm"
              />
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full min-h-[40vh] max-h-[70vh] p-6 text-lg border-2 border-gray-300 rounded-lg 
                     focus:border-blue-500 focus:outline-none resize-none overflow-y-auto
                     bg-white shadow-lg transition-all duration-200 ease-in-out
                     hover:border-gray-400 focus:shadow-xl"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
          />
          
          {/* Character count and actions */}
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm text-gray-500">{text.length} characters</div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setChecking(true);
                  try {
                    const res = await health();
                    setApiStatus(`Backend: ${res.status}`);
                  } catch (e: any) {
                    setApiStatus(`Backend error: ${e?.message ?? 'unknown'}`);
                  } finally {
                    setChecking(false);
                  }
                }}
                className="px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm"
                disabled={checking}
              >
                {checking ? 'Checking…' : 'Check Backend'}
              </button>
              {apiStatus && <span className="text-sm text-gray-700">{apiStatus}</span>}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-3">
            <span className="ml-auto" />
            <button
              className="px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
                if (lines.length === 0) return;
                const isValid = (e: string) => /.+@.+\..+/.test(e);
                if (!isValid(email1) || !isValid(email2)) {
                  setApiStatus('Please enter two valid recipient emails before asking.');
                  return;
                }
                setAsking(true);
                setAnswer(null);
                setResults([]);
                try {
                  let history: { question: string; answer?: string | null; action?: string | null }[] = [];
                  for (const q of lines) {
                    try {
                      const res = await askWithHistory(q, history);
                      const row = { question: q, best_policy: res.best_policy, confidence: res.confidence, engine: res.engine, answer: res.answer, llm_engine: res.llm_engine, action: res.action, model_confidence: res.model_confidence, confidence_reasoning: res.confidence_reasoning, sources: res.sources };
                      setAnswer({ best_policy: res.best_policy, confidence: res.confidence, engine: res.engine });
                      setResults(prev => [...prev, row]);
                      history = [...history, { question: q, answer: res.answer ?? null, action: res.action ?? null }];
                    } catch (e: any) {
                      const row = { question: q, best_policy: 'error', confidence: 0, engine: e?.message ?? 'error' } as any;
                      setResults(prev => [...prev, row]);
                      setApiStatus(`Ask error for "${q}": ${e?.message ?? 'unknown'}`);
                    }
                    await new Promise(r => setTimeout(r, 50));
                  }
                } finally {
                  setAsking(false);
                }
              }}
              disabled={
                asking ||
                text.trim().length === 0 ||
                !/.+@.+\..+/.test(email1) ||
                !/.+@.+\..+/.test(email2)
              }
            >
              {asking ? 'Asking…' : 'Ask Agent'}
            </button>
            <button
              className="px-3 py-2 rounded-md border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                const isValid = (e: string) => /.+@.+\..+/.test(e);
                if (!isValid(email1) || !isValid(email2)) {
                  setApiStatus('Please enter two valid recipient emails before sending completion.');
                  return;
                }
                try {
                  const suggestions = results
                    .map((r, idx) => ({ idx, r }))
                    .filter(x => x.r.action === 'suggest' && (x.r.answer && x.r.answer.trim().length > 0))
                    .map(x => ({ id: `sug-${x.idx + 1}`, text: x.r.answer!.trim() }));

                  const sid = sessionId.trim() || `run-${Date.now()}`;
                  if (suggestions.length > 0) {
                    await upsertSuggestions(sid, suggestions);
                  }
                  const to = [email1.trim(), email2.trim()];
                  // compute stats
                  const answered = results.filter(r => r.action === 'answer').length;
                  const suggested = results.filter(r => r.action === 'suggest').length;
                  const flagged = results.filter(r => r.action === 'flag').length;
                  const resp = await sendCompletion(sid, completionSubject || 'Job Completed', completionPreface || null, to, { answered, suggested, flagged });
                  setApiStatus(`Completion email sent to: ${resp.to.join(', ')} · accepted suggestions included: ${resp.accepted_count}`);
                } catch (e: any) {
                  setApiStatus(`Completion email failed: ${e?.message ?? 'unknown'}`);
                }
              }}
            >
              Send Completion
            </button>
          </div>

          {/* Legend */}
          <div className="mt-4 text-xs text-gray-700 flex items-center gap-3">
            <span className="font-semibold">Legend:</span>
            <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-green-100 text-green-800 border-green-300">ANSWER · 0.95</span>
            <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-orange-100 text-orange-800 border-orange-300">SUGGEST · 0.72</span>
            <span className="inline-block px-2 py-0.5 border rounded font-semibold bg-red-100 text-red-800 border-red-300">FLAG · 0.30</span>
            <span className="ml-2 text-gray-500">(badge shows action and confidence)</span>
          </div>

          {/* Sequential Q&A results */}
          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              {results.map((r, idx) => {
                const badgeColor = r.action === 'answer' ? 'bg-green-100 text-green-800 border-green-300' : r.action === 'suggest' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-red-100 text-red-800 border-red-300';
                const badgeLabel = r.action ? r.action.toUpperCase() : 'RESULT';
                return (
                  <div key={idx} className="p-4 border rounded bg-gray-50 text-sm text-gray-800">
                    <div className="font-semibold">{idx + 1}. Q: {r.question}</div>
                    {r.answer && (
                      <div className="mt-1 whitespace-pre-wrap"><span className="font-semibold">{r.action === 'suggest' ? 'Suggestion' : 'Answer'}:</span> {r.answer}</div>
                    )}
                    <div className={`inline-block mt-2 px-2 py-0.5 border rounded text-xs font-semibold ${badgeColor}`}>{badgeLabel}{typeof r.model_confidence === 'number' ? ` · ${r.model_confidence.toFixed(2)}` : ''}</div>
                    <div className="mt-1"><span className="font-semibold">Best Policy:</span> {r.best_policy || 'n/a'}</div>
                    <div><span className="font-semibold">Engine:</span> {r.engine}{r.llm_engine ? ` · ${r.llm_engine}` : ''}</div>
                    {r.sources && r.sources.length > 0 && (
                      <div className="mt-1"><span className="font-semibold">Sources:</span> {r.sources.join('; ')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}