'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const ConfirmationResult = () => {
    const router = useRouter();
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

    const handleSubmit = () => {
        if (!email.trim()) {
            alert('Please enter an email address');
            return;
        }
        
        // Here you would typically send the data to your API
        console.log('Submitting:', { changes, email });
        
        // Navigate back to homepage
        router.push('/');
    };

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
                    
                    {/* Email input field */}
                    <div className="mb-8">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="w-full p-3 text-sm border-2 border-gray-300 rounded-lg 
                                     focus:border-blue-500 focus:outline-none
                                     bg-white shadow-sm transition-all duration-200 ease-in-out
                                     hover:border-gray-400 focus:shadow-md"
                            required
                        />
                    </div>
                    
                    {/* Submit button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleSubmit}
                            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 
                                     font-medium shadow-lg hover:shadow-xl transition-all duration-200 
                                     disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={!email.trim()}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
