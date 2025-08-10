"use client";
import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import Button from '@mui/material/Button';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import { useRouter } from 'next/navigation';

interface ProgressMobileStepperProps {
  currentStep: number;
}

export const ProgressMobileStepper = ({ currentStep }: ProgressMobileStepperProps) => {
  const router = useRouter();
  const theme = useTheme();
  const [activeStep, setActiveStep] = React.useState(currentStep);

  const rerouteToNewPage = () => {
    if (activeStep == 1) {
      router.push('/');
    } else if (activeStep == 2) {
      router.push('/');
    }  else {
      router.push('/');
    }
  }

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    rerouteToNewPage();
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    rerouteToNewPage();
  };

  return (
    <MobileStepper
      variant="progress"
      steps={3}
      position="static"
      activeStep={activeStep}
      sx={{ maxWidth: 2000, flexGrow: 1, background: "transparent", width: "100%" }}
      nextButton={
        <Button size="small" onClick={handleNext} disabled={activeStep === 3}>
          Next
          {theme.direction === 'rtl' ? (
            <KeyboardArrowLeft />
          ) : (
            <KeyboardArrowRight />
          )}
        </Button>
      }
      backButton={
        <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
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
