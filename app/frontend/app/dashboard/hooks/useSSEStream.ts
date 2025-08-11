import { useRef, useCallback, useEffect } from 'react';
import { API_BASE } from '../../../lib/api';
import { SSEEvent, QuestionStatus } from '../types/dashboard.types';

interface UseSSEStreamProps {
  onEvent: (event: SSEEvent) => void;
  onConnectionChange: (connected: boolean) => void;
  onError?: (error: { code?: string; message: string; readyState: number }) => void;
}

interface StartStreamOptions {
  sessionId: string;
  debug?: boolean;
}

const READY_STATE_NAMES = {
  0: 'CONNECTING',
  1: 'OPEN', 
  2: 'CLOSED'
} as const;

const INITIAL_RETRY_DELAY = 1000; // 1s
const MAX_RETRY_DELAY = 30000; // 30s
const HEARTBEAT_TIMEOUT = 30000; // 30s
const MAX_RECONNECT_ATTEMPTS = 10;

export function useSSEStream({ onEvent, onConnectionChange, onError }: UseSSEStreamProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastOptionsRef = useRef<StartStreamOptions | null>(null);
  const isManuallyStoppedRef = useRef(false);

  const log = useCallback((message: string, data?: any) => {
    console.log(`[SSE] ${message}`, data || '');
  }, []);

  const logError = useCallback((message: string, data?: any) => {
    console.error(`[SSE] ${message}`, data || '');
  }, []);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const resetHeartbeatWatchdog = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      log('Heartbeat timeout - no message received in 30s, reconnecting');
      if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
        eventSourceRef.current.close();
      }
    }, HEARTBEAT_TIMEOUT);
  }, [log]);

  const calculateRetryDelay = useCallback((attempt: number) => {
    const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
    const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
    return Math.floor(baseDelay + jitter);
  }, []);

  const attemptReconnect = useCallback((options: StartStreamOptions) => {
    if (isManuallyStoppedRef.current) {
      log('Reconnect skipped - stream manually stopped');
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      logError('Max reconnection attempts reached, giving up');
      onConnectionChange(false);
      onError?.({
        message: `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`,
        readyState: EventSource.CLOSED
      });
      return;
    }

    const delay = calculateRetryDelay(reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;
    
    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      startStreamInternal(options);
    }, delay);
  }, [onConnectionChange, onError, calculateRetryDelay, log, logError]);

  const startStreamInternal = useCallback((options: StartStreamOptions) => {
    if (eventSourceRef.current) {
      log('Closing existing connection');
      eventSourceRef.current.close();
    }

    clearTimeouts();
    
    const params = new URLSearchParams({
      sessionId: options.sessionId,
      ...(options.debug && { debug: 'true' })
    });
    
    const url = `/api/runs/${options.sessionId}/stream`;
    log(`Connecting to: ${url}`);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    lastOptionsRef.current = options;

    // Log initial state
    log(`Initial readyState: ${eventSource.readyState} (${READY_STATE_NAMES[eventSource.readyState as keyof typeof READY_STATE_NAMES]})`);

    eventSource.onopen = (event) => {
      log(`Connection opened - readyState: ${eventSource.readyState} (${READY_STATE_NAMES[eventSource.readyState as keyof typeof READY_STATE_NAMES]})`);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
      onConnectionChange(true);
      resetHeartbeatWatchdog();
    };

    eventSource.onmessage = (event) => {
      log('Received message event', { 
        data: event.data, 
        lastEventId: event.lastEventId,
        readyState: eventSource.readyState 
      });
      
      resetHeartbeatWatchdog(); // Reset watchdog on any message
      
      try {
        const raw = JSON.parse(event.data);
        // Normalize backend payload shape -> frontend SSEEvent
        // Backend emits: {type, run_id, question_id, stage, status, payload, metrics}
        if (raw && raw.type === 'question_update') {
          const stage = raw.stage as string | undefined;
          const payload = (raw.payload ?? {}) as Record<string, any>;
          let normalizedStatus: 'pending' | 'processing' | 'answered' | 'flagged' | undefined;
          let answer: string | undefined;
          let decision: string | undefined;
          let verification_conf: number | undefined;
          let confidence: number | undefined;

          switch (stage) {
            case 'answering':
            case 'review':
            case 'risk':
            case 'retrying':
              normalizedStatus = 'processing';
              break;
            case 'final': {
              decision = (payload.decision as string) ?? undefined;
              // Mark answered/flagged based on final decision
              normalizedStatus = decision === 'answer' ? 'answered' : 'flagged';
              answer = (payload.answer as string) ?? undefined;
              // Prefer model confidence from answer stage if available
              confidence = typeof payload.answer_confidence === 'number'
                ? payload.answer_confidence
                : undefined;
              verification_conf = typeof payload.verification_conf === 'number'
                ? payload.verification_conf
                : undefined;
              break;
            }
            default:
              // Fallback to mapping known status strings if stage is absent
              if (raw.status === 'final') normalizedStatus = 'answered';
          }

          onEvent({
            type: 'question_update',
            question_id: raw.question_id as string | undefined,
            status: normalizedStatus,
            answer,
            decision,
            verification_conf,
            confidence,
          });
          return;
        }

        // Pass through other event types unchanged
        onEvent(raw);
      } catch (error) {
        logError('Failed to parse SSE message:', { error, data: event.data });
      }
    };

    // Handle custom event types
    eventSource.addEventListener('error', (event: any) => {
      logError('Received error event', event.data);
      try {
        const errorData = JSON.parse(event.data);
        onError?.({
          code: errorData.code,
          message: errorData.message || 'Server error',
          readyState: eventSource.readyState
        });
      } catch (e) {
        onError?.({
          message: 'Server sent error event with invalid JSON',
          readyState: eventSource.readyState
        });
      }
    });

    eventSource.addEventListener('status', (event: any) => {
      log('Received status event', event.data);
      resetHeartbeatWatchdog();
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (error) {
        logError('Failed to parse status event:', error);
      }
    });

    eventSource.onerror = (event) => {
      const readyState = eventSource.readyState;
      const readyStateName = READY_STATE_NAMES[readyState as keyof typeof READY_STATE_NAMES];
      
      logError('Connection error', {
        readyState,
        readyStateName,
        url,
        event
      });

      clearTimeouts();
      onConnectionChange(false);

      // Only attempt reconnect if connection was closed (readyState === 2)
      if (readyState === EventSource.CLOSED && !isManuallyStoppedRef.current) {
        log('Connection closed, attempting reconnect...');
        attemptReconnect(options);
      } else if (readyState === EventSource.CONNECTING) {
        log('Connection failed during handshake');
        onError?.({
          message: 'Failed to establish SSE connection',
          readyState
        });
      }
    };
  }, [onEvent, onConnectionChange, onError, clearTimeouts, resetHeartbeatWatchdog, attemptReconnect, log, logError]);

  const startStream = useCallback((options: StartStreamOptions) => {
    isManuallyStoppedRef.current = false;
    reconnectAttemptsRef.current = 0;
    startStreamInternal(options);
  }, [startStreamInternal]);

  const stopStream = useCallback(() => {
    log('Manually stopping stream');
    isManuallyStoppedRef.current = true;
    clearTimeouts();
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    onConnectionChange(false);
  }, [onConnectionChange, clearTimeouts, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [clearTimeouts]);

  return { startStream, stopStream };
}
