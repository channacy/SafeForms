import { Navbar } from "../../../components/layout/Navbar"
import { QuestionResponse } from "../../../components/layout/QuestionResponse"

export default function Page() {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20">
            <Navbar/>
            <h1>AI Autofilled Responses With Unsure/Low Confident Scores</h1>
            <QuestionResponse question="What is the software?" response="A code editor with installed" confidenceScore={10}/>
            <QuestionResponse question="How is data protected?" response="No" confidenceScore={10}/>
            <div className="flex justify-end mt-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Continue
          </button>
        </div>
        </div>
    )
  }