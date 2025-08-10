// src/components/ThemeRegistry/ThemeRegistry.tsx (or similar path)
'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../../../theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kicks off a nice, clean baseline to build upon. */}
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}