// src/components/ThemeRegistry/theme.ts
import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
  palette: {
    warning: {
        main: '#FCF0E4',
        dark: '#f0e3d5',
      },
    error: {
        main: '#F9E9E9',
        dark: '#ddebd5'
    },
  }
});

export default theme;