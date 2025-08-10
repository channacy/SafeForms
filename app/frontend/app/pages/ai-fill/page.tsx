'use client';

import { useState } from 'react';
import { Navbar } from "../../components/layout/Navbar";
import { ProgressMobileStepper } from "../../components/layout/ProgressMobileStepper"
import { AutoFillResults } from '../../components/sections/AutoFillResults';
import { QuestionInput } from '../../components/sections/QuestionInput';

export default function Page() {
  const [userInput, setUserInput] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ProgressMobileStepper currentStep={activeStep} setCurrentStep={setActiveStep}/>
      {/* Main content area */}
      {activeStep == 0 && <QuestionInput />}
      {activeStep == 1 && <AutoFillResults />}
      {/* {activeStep = 2 && } */}
    </div>
  );
}