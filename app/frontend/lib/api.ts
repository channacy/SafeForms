export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function health() {
  const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<{ status: string }>;
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
