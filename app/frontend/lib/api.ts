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
  }>;
}

