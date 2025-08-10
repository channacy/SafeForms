'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
      <main className="w-full max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-900 text-center">Welcome to SafeForms</h1>
        <p className="mt-2 text-center text-emerald-800">Choose a workflow to get started.</p>
        <div className="mt-10 flex items-center justify-center">
          <Link href="/pages/ai-fill" className="block group">
            <div className="h-full rounded-xl border border-emerald-200 bg-white p-6 shadow-sm group-hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold">AI</div>
              <h2 className="mt-4 text-xl font-bold text-emerald-900">AI Auto-Fill Answers</h2>
              <p className="mt-1 text-sm text-emerald-800">Use the AI agent to propose answers, email reviewers, and collect approvals.</p>
              <span className="mt-4 inline-flex items-center text-emerald-700 font-semibold">Go →</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}