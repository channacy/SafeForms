"use client";
import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import Button from '@mui/material/Button';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

interface ProgressMobileStepperProps {
  currentStep: number;  
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const ProgressMobileStepper = ({ currentStep, setCurrentStep }: ProgressMobileStepperProps) => {
  const theme = useTheme();

  const handleNext = () => {
    setCurrentStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setCurrentStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <MobileStepper
      variant="progress"
      steps={3}
      position="static"
      activeStep={currentStep}
      sx={{ maxWidth: 2000, flexGrow: 1, background: "transparent", width: "100%" }}
      nextButton={
        <Button size="small" onClick={handleNext} disabled={currentStep === 2}>
          Next
          {theme.direction === 'rtl' ? (
            <KeyboardArrowLeft />
          ) : (
            <KeyboardArrowRight />
          )}
        </Button>
      }
      backButton={
        <Button size="small" onClick={handleBack} disabled={currentStep === 0}>
          {theme.direction === 'rtl' ? (
            <KeyboardArrowRight />
          ) : (
            <KeyboardArrowLeft />
          )}
          Back
        </Button>
      }
    />
  );
}
