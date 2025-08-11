import { useState, useEffect } from 'react';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export function useSessionPersistence() {
  const [sessionId, setSessionId] = useState('');

  // Load persisted session ID on mount
  useEffect(() => {
    const saved = localStorage.getItem('safeforms_session_id');
    if (saved && validateUuid(saved)) {
      setSessionId(saved);
    }
  }, []);

  // Save session ID to localStorage whenever it changes
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
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
    }
  };

  const isValidSessionId = Boolean(sessionId && validateUuid(sessionId));

  return {
    sessionId,
    setSessionId,
    generateSessionId,
    copySessionId,
    isValidSessionId
  };
}
