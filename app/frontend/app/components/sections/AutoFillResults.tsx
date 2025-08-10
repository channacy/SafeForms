"use client"
import { QuestionResponse } from "../../components/layout/QuestionResponse"

// TODO: 
export default interface Props {
    // data: {question: [], response: []};
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const AutoFillResults = ({setCurrentStep}: Props) => {
    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-8">
                <div className="w-full max-w-4xl">
                    <h1 className="text-2xl font-bold text-center mb-8">AI Autofilled Responses With Unsure/Low Confident Scores</h1>
                    <p className="text-gray-600 text-center mb-8">
                        Review the responses below that have low confidence scores and make any necessary adjustments.
                    </p>
                    <div className="space-y-6">
                        <QuestionResponse question="What is the software?" response="A code editor with installed" confidenceScore={10}/>
                        <QuestionResponse question="How is data protected?" response="No" confidenceScore={10}/>
                    </div>
                    <div className="flex justify-center mt-8">
                        <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600" onClick={() => setCurrentStep((prevActiveStep) => prevActiveStep + 1)}>
                            Continue
                </button>
                    </div>
                </div>
            </div>
        </div>
    )
}