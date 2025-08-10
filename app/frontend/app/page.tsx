
'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from "./components/layout/Navbar";
import { health, ask } from "../lib/api";

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
                  for (const q of lines) {
                    try {
                      const res = await ask(q);
                      const row = { question: q, best_policy: res.best_policy, confidence: res.confidence, engine: res.engine };
                      setAnswer({ best_policy: res.best_policy, confidence: res.confidence, engine: res.engine });
                      setResults(prev => [...prev, row]);
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
              {asking ? 'Running batch…' : 'Ask RAG'}
            </button>
          </div>

          {/* Sequential Q&A results */}
          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              {results.map((r, idx) => (
                <div key={idx} className="p-4 border rounded bg-gray-50 text-sm text-gray-800">
                  <div className="font-semibold">{idx + 1}. Q: {r.question}</div>
                  <div className="mt-1"><span className="font-semibold">Best Policy:</span> {r.best_policy || 'n/a'}</div>
                  <div><span className="font-semibold">Confidence:</span> {r.confidence.toFixed(3)}</div>
                  <div><span className="font-semibold">Engine:</span> {r.engine}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}