'use client';

import { useState } from 'react';
import { Navbar } from "../../components/layout/Navbar";
import { ProgressMobileStepper } from "../../components/layout/ProgressMobileStepper"
import { AutoFillResults } from '../../components/sections/AutoFillResults';
import { QuestionInput } from '../../components/sections/QuestionInput';
import { ConfirmationResult } from '../../components/sections/ConfirmationResult'

export default function Page() {
  const [userInput, setUserInput] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [nextEnabled, setNextEnabled] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ProgressMobileStepper currentStep={activeStep} setCurrentStep={setActiveStep} nextStepEnabled={nextEnabled}/>
      {/* Main content area */}
      {activeStep == 0 && <QuestionInput userInput={userInput} setCurrentStep={setActiveStep} setNextStep={setNextEnabled}/>}
      {activeStep == 1 && <AutoFillResults setCurrentStep={setActiveStep}/>}
      {activeStep == 2 && <ConfirmationResult />}
    </div>
  );
}