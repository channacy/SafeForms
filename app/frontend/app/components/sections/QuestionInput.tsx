'use client';

import { useRef, useEffect } from 'react';

interface Props {
  text: string;
  setText: (value: string) => void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setNextStep: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: () => void;
}

export const QuestionInput = ({ text, setText, setCurrentStep, setNextStep, onSubmit }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleNext = () => {
    if (!text.trim()) return;
    onSubmit();
    setCurrentStep(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
        <div className="w-full max-w-4xl">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              setText(value);
              setNextStep(!!value.trim());
            }}
            placeholder="Paste your questionnaire here..."
            className="w-full min-h-[40vh] max-h-[70vh] p-6 text-lg border-2 border-gray-300 rounded-lg 
                     focus:border-blue-500 focus:outline-none resize-none overflow-y-auto
                     bg-white shadow-lg transition-all duration-200 ease-in-out
                     hover:border-gray-400 focus:shadow-xl"
            style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
          />
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm text-gray-500">{text.length} characters</div>
            <button
              onClick={handleNext}
              disabled={!text.trim()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
