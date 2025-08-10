// Use relative paths for Next.js API route handlers which act as a proxy
export const API_BASE = '';

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
  const url = `${API_BASE}/api/runs/plane-a/ask?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Ask failed: ${res.status}`);
  }
  const planeAResult = await res.json();
  
  // Transform Plane-A response to match expected format
  return {
    question: planeAResult.question,
    best_policy: planeAResult.citations?.[0]?.doc_id || "unknown",
    confidence: planeAResult.confidence_docqa,
    engine: planeAResult.engine,
    answer: planeAResult.answer,
    llm_engine: "plane-a",
    action: planeAResult.action,
    model_confidence: planeAResult.confidence_docqa,
    sources: planeAResult.citations?.map((c: any) => `${c.doc_id} - ${c.quote}`) || []
  };
}

export async function askWithHistory(question: string, history: Array<{ question: string; answer?: string | null; action?: string | null }>) {
  // Plane-A doesn't use history - it's strict extractive QA only
  // Use the same ask function but ignore history for now
  const planeAResult = await ask(question);
  
  // Transform to match expected format
  return {
    question: planeAResult.question,
    best_policy: planeAResult.best_policy,
    confidence: planeAResult.confidence,
    engine: planeAResult.engine,
    answer: planeAResult.answer,
    llm_engine: planeAResult.llm_engine,
    action: planeAResult.action as 'answer' | 'suggest' | 'flag',
    model_confidence: planeAResult.model_confidence,
    confidence_reasoning: planeAResult.action === 'flag' ? 'Abstained due to low confidence' : 'Extractive answer from policy',
    sources: planeAResult.sources
  };
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
