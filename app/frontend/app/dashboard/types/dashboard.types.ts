export interface QuestionStatus {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'answered' | 'flagged';
  confidence?: number;
  answer?: string;
  decision?: 'answer' | 'suggest' | 'flag';
  verification_conf?: number;
}

export interface BatchRun {
  sessionId: string;
  runId: string;
  questions: QuestionStatus[];
  isRunning: boolean;
  isComplete: boolean;
  startedAt?: Date;
  completedAt?: Date;
  stats?: {
    answered: number;
    suggested: number;
    flagged: number;
  };
}

export interface SSEEvent {
  type: 'question_update' | 'run_complete' | 'error';
  question_id?: string;
  status?: QuestionStatus['status'];
  confidence?: number;
  answer?: string;
  decision?: string;
  verification_conf?: number;
  error?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'json';
  runId: string;
}
