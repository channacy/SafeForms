
'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from "./components/layout/Navbar";
import { health, askWithHistory } from "../lib/api";

export default function Home() {
  const [text, setText] = useState('');
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [answer, setAnswer] = useState<null | { best_policy: string; confidence: number; engine: string }>(null);
  const [asking, setAsking] = useState(false);
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

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Main content area */}
      <div className="flex-1 flex items-start justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-4xl">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full min-h-[50vh] max-h-[75vh] p-6 text-lg border-2 border-gray-300 rounded-lg 
                     focus:border-blue-500 focus:outline-none resize-none overflow-y-auto
                     bg-white shadow-lg transition-all duration-200 ease-in-out
                     hover:border-gray-400 focus:shadow-xl"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
          />
          
          {/* Character count indicator */}
          <div className="mt-2 text-right text-sm text-gray-500">
            {text.length} characters
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-3">
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
            {apiStatus && (
              <span className="text-sm text-gray-700">{apiStatus}</span>
            )}

            {/* Ask RAG (aligned to the right) */}
            <span className="ml-auto" />
            <button
              onClick={async () => {
                const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
                if (lines.length === 0) return;
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
                      // record error row
                      const row = { question: q, best_policy: 'error', confidence: 0, engine: e?.message ?? 'error' } as any;
                      setResults(prev => [...prev, row]);
                      setApiStatus(`Ask error for "${q}": ${e?.message ?? 'unknown'}`);
                    }
                    // Optional small delay for UI rendering cadence
                    await new Promise(r => setTimeout(r, 50));
                  }
                } finally {
                  setAsking(false);
                }
              }}
              className="px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm"
              disabled={asking || text.trim().length === 0}
            >
              {asking ? 'Asking…' : 'Ask Agent'}
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
              ); })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}