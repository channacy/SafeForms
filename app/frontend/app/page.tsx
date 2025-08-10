
'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from "./components/layout/Navbar";
import { health } from "../lib/api";

export default function Home() {
  const [text, setText] = useState('');
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
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

          {/* Backend health check */}
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
          </div>
        </div>
      </div>
    </div>
  );
}