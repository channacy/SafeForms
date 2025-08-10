'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from "../../components/layout/Navbar";
import { fetchReview, submitApprovals } from "../../../lib/api";

export default function ApprovalsPage() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [approver, setApprover] = useState('');
  const [items, setItems] = useState<Array<{ id: string; text: string; accepted_by: string[]; rejected_by: string[] }>>([]);
  const [decisions, setDecisions] = useState<Record<string, boolean | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setError('Missing token');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchReview(token);
        if (!active) return;
        setSessionId(data.session_id);
        setApprover(data.approver);
        setItems(data.suggestions);
        // Pre-fill decisions from existing state (if approver already acted)
        const pre: Record<string, boolean | undefined> = {};
        for (const s of data.suggestions) {
          if (s.accepted_by.includes(data.approver)) pre[s.id] = true;
          if (s.rejected_by.includes(data.approver)) pre[s.id] = false;
        }
        setDecisions(pre);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load review');
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const decidedCount = useMemo(() => Object.values(decisions).filter(v => v !== undefined).length, [decisions]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmittedMsg('');
    setError(null);
    try {
      const payload = Object.entries(decisions)
        .filter(([, v]) => v !== undefined)
        .map(([suggestion_id, accept]) => ({ suggestion_id, accept: Boolean(accept) }));
      const resp = await submitApprovals(token, payload);
      setSubmittedMsg(`Saved ${resp.updated} decisions. You can close this page.`);
    } catch (e: any) {
      setError(e?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold">Review Suggestions</h1>
        {loading && <div className="mt-4 text-gray-600">Loading…</div>}
        {error && <div className="mt-4 text-red-700 bg-red-50 border border-red-200 p-3 rounded">{error}</div>}
        {!loading && !error && (
          <div className="mt-4">
            <div className="text-sm text-gray-700">Session: <span className="font-mono">{sessionId}</span></div>
            <div className="text-sm text-gray-700">Approver: <span className="font-mono">{approver}</span></div>

            <div className="mt-4 space-y-3">
              {items.length === 0 && (
                <div className="text-sm text-gray-600">No suggestions available.</div>
              )}
              {items.map((s, idx) => (
                <div key={s.id} className="p-4 border rounded bg-white shadow-sm">
                  <div className="text-xs text-gray-500">{idx + 1}. ID: {s.id}</div>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{s.text}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className={`px-3 py-1.5 rounded border text-sm ${decisions[s.id] === true ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                      onClick={() => setDecisions(prev => ({ ...prev, [s.id]: true }))}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded border text-sm ${decisions[s.id] === false ? 'bg-red-600 text-white border-red-700' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                      onClick={() => setDecisions(prev => ({ ...prev, [s.id]: false }))}
                      type="button"
                    >
                      Deny
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded border text-sm ${decisions[s.id] === undefined ? 'bg-gray-600 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => setDecisions(prev => ({ ...prev, [s.id]: undefined }))}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="text-sm text-gray-700">Decided: {decidedCount} / {items.length}</div>
              <button
                className="ml-auto px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={submitting || items.length === 0}
              >
                {submitting ? 'Saving…' : 'Submit Decisions'}
              </button>
            </div>

            {submittedMsg && <div className="mt-3 text-green-700 bg-green-50 border border-green-200 p-3 rounded">{submittedMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
