'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
      <main className="w-full max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-900 text-center">Welcome to SafeForms</h1>
        <p className="mt-2 text-center text-emerald-800">Choose a workflow to get started.</p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link href="/pages/ai-fill" className="block group">
            <div className="h-full rounded-xl border border-emerald-200 bg-white p-6 shadow-sm group-hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold">AI</div>
              <h2 className="mt-4 text-xl font-bold text-emerald-900">AI Auto-Fill</h2>
              <p className="mt-1 text-sm text-emerald-800">Single question AI agent with review workflow.</p>
              <span className="mt-4 inline-flex items-center text-emerald-700 font-semibold">Go →</span>
            </div>
          </Link>
          
          <Link href="/dashboard" className="block group">
            <div className="h-full rounded-xl border border-blue-200 bg-white p-6 shadow-sm group-hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold">⚡</div>
              <h2 className="mt-4 text-xl font-bold text-blue-900">Batch Dashboard</h2>
              <p className="mt-1 text-sm text-blue-800">Process multiple questions with live streaming and reports.</p>
              <span className="mt-4 inline-flex items-center text-blue-700 font-semibold">Go →</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}