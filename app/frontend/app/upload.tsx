'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from "../app/components/layout/Navbar";

export default function Upload() {
  const [text, setText] = useState('');
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
        </div>
      </div>
    </div>
  );
}
