export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function health() {
  const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<{ status: string }>;
}

// Approvals API
export async function fetchReview(token: string) {
  const url = `${API_BASE}/api/approvals/review?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch review failed: ${res.status}`);
  return res.json() as Promise<{
    session_id: string;
    approver: string;
    suggestions: Array<{ id: string; text: string; accepted_by: string[]; rejected_by: string[] }>
  }>;
}

export async function submitApprovals(token: string, decisions: Array<{ suggestion_id: string; accept: boolean }>) {
  const url = `${API_BASE}/api/approvals/submit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ token, decisions }),
  });
  if (!res.ok) throw new Error(`Submit approvals failed: ${res.status}`);
  return res.json() as Promise<{ status: string; updated: number }>;
}

export async function ask(query: string) {
  const url = `${API_BASE}/api/runs/ask?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Ask failed: ${res.status}`);
  }
  return res.json() as Promise<{
    question: string;
    best_policy: string;
    confidence: number;
    engine: string;
    answer?: string;
    llm_engine?: string;
  }>;
}

export async function askWithHistory(question: string, history: Array<{ question: string; answer?: string | null; action?: string | null }>) {
  const url = `${API_BASE}/api/runs/ask`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    throw new Error(`Ask (POST) failed: ${res.status}`);
  }
  return res.json() as Promise<{
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
  }>;
}

export async function sendProgress(subject: string, message: string, to: string[]) {
  const url = `${API_BASE}/api/email/progress`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ subject, message, to }),
  });
  if (!res.ok) throw new Error(`Progress email failed: ${res.status}`);
  return res.json() as Promise<{ status: string; to: string[] }>;
}

export async function upsertSuggestions(session_id: string, suggestions: Array<{ id: string; text: string }>) {
  const url = `${API_BASE}/api/email/suggestions/upsert`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ session_id, suggestions }),
  });
  if (!res.ok) throw new Error(`Upsert suggestions failed: ${res.status}`);
  return res.json() as Promise<{ status: string; count: number }>;
}

export async function sendCompletion(session_id: string, subject: string, preface: string | null, to: string[], stats?: { answered: number; suggested: number; flagged: number }) {
  const url = `${API_BASE}/api/email/completion`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ session_id, subject, preface, to, stats }),
  });
  if (!res.ok) throw new Error(`Completion email failed: ${res.status}`);
  return res.json() as Promise<{ status: string; to: string[]; accepted_count: number }>;
}
