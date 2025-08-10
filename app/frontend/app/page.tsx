'use client';

import Link from 'next/link';
import { Navbar } from "./components/layout/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-b from-emerald-50 to-white">
        <div className="w-full max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-900 text-center">Welcome to SafeForms</h1>
          <p className="mt-2 text-center text-emerald-800">Choose a workflow to get started.</p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/pages/ai-fill" className="block group">
              <div className="h-full rounded-xl border border-emerald-200 bg-white p-6 shadow-sm group-hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold">AI</div>
                <h2 className="mt-4 text-xl font-bold text-emerald-900">AI Auto-Fill Answers</h2>
                <p className="mt-1 text-sm text-emerald-800">Use the AI agent to propose answers, email reviewers, and collect approvals.</p>
                <span className="mt-4 inline-flex items-center text-emerald-700 font-semibold">Go →</span>
              </div>
            </Link>
            <Link href="/pages/questionnaire" className="block group">
              <div className="h-full rounded-xl border border-emerald-200 bg-white p-6 shadow-sm group-hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold">VQ</div>
                <h2 className="mt-4 text-xl font-bold text-emerald-900">Generate Vendor Questionnaire</h2>
                <p className="mt-1 text-sm text-emerald-800">Create a vendor questionnaire package for distribution.</p>
                <span className="mt-4 inline-flex items-center text-emerald-700 font-semibold">Go →</span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}