'use client';

interface Props {
  results: any[];
  emails: { email1: string; email2: string };
  setEmails: (e: { email1: string; email2: string }) => void;
  apiStatus: string;
  setApiStatus: (v: string) => void;
  sendCompletion: (subject: string, preface: string) => Promise<void>;
}

import { useState } from 'react';
import DownloadIcon from '@mui/icons-material/Download';

export const ConfirmationResult = ({ results, emails, setEmails, apiStatus, sendCompletion }: Props) => {
    const handleSend = async () => {
        await sendCompletion('Job Completed', 'Accepted AI suggestions are included below.');
      };

    const [email, setEmail] = useState('');
    const [changes, setChanges] = useState(`Question: What is the software?
        Previous Response: A code editor with installed
        Updated Response: A comprehensive code editor with AI-powered features installed

        Question: How is data protected?
        Previous Response: No
        Updated Response: Data is protected through end-to-end encryption, secure authentication protocols, and regular security audits

        Question: What security measures are in place?
        Previous Response: Basic password protection
        Updated Response: Multi-factor authentication, role-based access control, encrypted data storage, and regular penetration testing`);

    return (
        <div className="min-h-screen flex flex-col">            
            <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
                <div className="w-full max-w-4xl">
                    <h1 className="text-2xl font-bold text-center mb-4">Review and Submit Changes</h1>
                    <p className="text-gray-600 text-center mb-8">
                        Review the changes made during the AI autofill process. You can edit them below before submitting.
                    </p>
                    
                    {/* Editable changes text area */}
                    <div className="mb-6">
                        <label htmlFor="changes" className="block text-sm font-medium text-gray-700 mb-2">
                            Changes Made
                        </label>
                        <textarea
                            id="changes"
                            value={changes}
                            onChange={(e) => setChanges(e.target.value)}
                            className="w-full h-64 p-4 text-sm border-2 border-gray-300 rounded-lg 
                                     focus:border-blue-500 focus:outline-none resize-none overflow-y-auto
                                     bg-white shadow-sm transition-all duration-200 ease-in-out
                                     hover:border-gray-400 focus:shadow-md"
                            style={{
                                fontFamily: 'monospace',
                                lineHeight: '1.5',
                            }}
                        />
                    </div>

                    <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient 1</label>
            <input
              type="email"
              value={emails.email1}
              onChange={(e) => setEmails({ ...emails, email1: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600"
            >
            Send Email
            </button>
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600"
            >
                <DownloadIcon />
            </button>
          </div>
          {apiStatus && <div className="mt-4 text-center text-sm text-gray-700">{apiStatus}</div>}
        </div>
        </div>
        </div>
    );
}