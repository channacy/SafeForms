'use client';

interface Props {
  results: any[];
  emails: { email1: string; email2: string };
  setEmails: (e: { email1: string; email2: string }) => void;
  apiStatus: string;
  setApiStatus: (v: string) => void;
  sendCompletion: (subject: string, preface: string) => Promise<void>;
}

export const ConfirmationResult = ({ results, emails, setEmails, apiStatus, sendCompletion }: Props) => {
  const handleSend = async () => {
    await sendCompletion('Job Completed', 'Accepted AI suggestions are included below.');
  };

  return (
    <div className="min-h-screen flex flex-col">            
      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-2xl font-bold text-center mb-4">Review and Submit</h1>
          <p className="text-gray-600 text-center mb-8">
            Confirm the changes and send the final completion email.
          </p>
          
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
              Send Completion
            </button>
          </div>

          {apiStatus && <div className="mt-4 text-center text-sm text-gray-700">{apiStatus}</div>}
        </div>
      </div>
    </div>
  );
};
