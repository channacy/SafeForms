import React, { useState } from 'react';

import { BatchRun } from '../types/dashboard.types';

interface ReportActionsProps {
  batchRun: BatchRun | null;
}

export function ReportActions({ batchRun }: ReportActionsProps) {
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Show this section only when batch run is stopped or completed
  if (!batchRun || batchRun.isRunning) return null;

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailRegex.test(emailValue);
    setIsEmailValid(valid);
    return valid;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const sendEmailReport = async () => {
    if (!isEmailValid || !email.trim()) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSendingEmail(true);
    try {
                        const response = await fetch(`/api/proxy/api/runs/${batchRun.runId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
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
    } finally {
      setIsSendingEmail(false);
    }
  };

  const downloadReport = async () => {
    setIsDownloading(true);
    try {
                        const response = await fetch(`/api/proxy/api/runs/${batchRun.runId}/export/pdf`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safeforms-report-${batchRun.runId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        {batchRun.isComplete ? 'Batch Processing Complete!' : 'Batch Processing Stopped'}
      </h3>
      
      <div className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-blue-800 mb-2">
            Email Address (required)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email address"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              email && !isEmailValid 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 bg-white'
            }`}
            required
          />
          {email && !isEmailValid && (
            <p className="text-red-600 text-sm mt-1">Please enter a valid email address</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={sendEmailReport}
            disabled={!isEmailValid || !email.trim() || isSendingEmail}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              !isEmailValid || !email.trim() || isSendingEmail
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSendingEmail ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              '📧 Send Report'
            )}
          </button>

          <button
            onClick={downloadReport}
            disabled={isDownloading}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              isDownloading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isDownloading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </span>
            ) : (
              '📥 Download Now'
            )}
          </button>
        </div>

        {/* Summary Stats */}
        {batchRun.stats && (
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <p className="text-sm text-blue-800 font-medium">
              Processing Summary: {batchRun.stats.answered} answered, {batchRun.stats.suggested} suggested, {batchRun.stats.flagged} flagged
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
