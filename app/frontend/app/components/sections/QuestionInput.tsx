'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from "../../components/layout/Navbar";

export const QuestionInput = () => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'ai-fill' | 'questionnaire'>('ai-fill');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

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

  const handleSubmit = () => {
    if (!text.trim()) return;
    
    if (mode === 'ai-fill') {
      // Navigate to autofill page
      router.push('/pages/ai-fill/autofill');
    } else {
      // Navigate to questionnaire page
      router.push('/pages/questionnaire');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
        <div className="w-full max-w-4xl">

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'ai-fill'
                ? "Paste your questionnaire here..."
                : "Describe the vendor and your security requirements..."
            }
            className="w-full min-h-[40vh] max-h-[70vh] p-6 text-lg border-2 border-gray-300 rounded-lg 
                     focus:border-blue-500 focus:outline-none resize-none overflow-y-auto
                     bg-white shadow-lg transition-all duration-200 ease-in-out
                     hover:border-gray-400 focus:shadow-xl"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
          />
          
          {/* Character count indicator and submit button */}
          <div className="mt-2 flex justify-between items-center">
            <div></div>
            <div className="flex flex-col items-end">
              <div className="text-sm text-gray-500 mb-2">
                {text.length} characters
              </div>
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className={`px-8 py-3 rounded-lg text-white font-medium transition-all ${
                  text.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {mode === 'ai-fill' ? 'Auto-Fill' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}