import React from 'react';
import { API_BASE } from '../../../lib/api';
import { BatchRun } from '../types/dashboard.types';

interface ExportActionsProps {
  batchRun: BatchRun | null;
}

export function ExportActions({ batchRun }: ExportActionsProps) {
  if (!batchRun || !batchRun.isComplete) return null;

  const sendEmailReport = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/runs/${batchRun.runId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `SafeForms Report - ${batchRun.runId.substring(0, 8)}`,
          stats: batchRun.stats
        })
      });

      if (!response.ok) {
        throw new Error(`Email failed: ${response.status}`);
      }

      alert('Email report sent successfully!');
    } catch (error) {
      console.error('Email report failed:', error);
      alert('Failed to send email report. Please try again.');
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-green-900 mb-3">Report Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={sendEmailReport}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          📧 Email Report
        </button>
      </div>
      {batchRun.stats && (
        <div className="mt-3 text-sm text-green-700">
          Summary: {batchRun.stats.answered} answered, {batchRun.stats.suggested} suggested, {batchRun.stats.flagged} flagged
        </div>
      )}
    </div>
  );
}
