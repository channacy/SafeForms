import React from 'react';

interface SessionManagerProps {
  sessionId: string;
  onGenerateSession: () => void;
  onCopySession: () => void;
  isValid: boolean;
}

export function SessionManager({ sessionId, onGenerateSession, onCopySession, isValid }: SessionManagerProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Session ID (UUID v4)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={sessionId}
          readOnly
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
          placeholder="Click Generate to create a session ID"
        />
        <button
          onClick={onGenerateSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Generate
        </button>
        <button
          onClick={onCopySession}
          disabled={!isValid}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📋
        </button>
      </div>
    </div>
  );
}
