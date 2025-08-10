import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

interface Props {
  question: string;
  response: string;
  confidenceScore: number; 
}

export const QuestionResponse = ({ question, response, confidenceScore }: Props) => {
  const getBgColor = (score: number) => {
    if (score >= 0 && score < 20) return `error.main`;
    if (score >= 20 && score < 40) return `warning.main`;
    return `palette.grey[200]`;
  };

  return (
    <Box
      sx={{
        flex: 1, 
        width: 900,
        p: 2,
        gap: 2,
        borderRadius: 1,
        // bgcolor: '#FFFFFF',
        // '&:hover': {
        //   bgcolor: '#f5f5f5',
        // },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1 className='font-semibold'>{question}</h1>
      <Box component="form">
      <TextField
       sx={{
        '& .MuiInputLabel-root': { color: 'black' }, 
        '& .MuiInputLabel-root.Mui-focused': { color: 'black' },
        '& .MuiFormHelperText-root': { color: 'black' },
        "& .MuiInput-underline:before": {
            borderBottomColor: "grey",
          },
          "& .MuiInput-underline:hover:before": {
            borderBottomColor: "grey",
          },
          "& .MuiInput-underline:after": {
            borderBottomColor: "grey",
          },
      }}
        id="responseBox"
        label="Response"
        multiline
        fullWidth
        defaultValue={response}
        variant="standard"
      />
      </Box>
      <Box
      sx={{
        backgroundColor: getBgColor(confidenceScore),
        borderRadius: '8px',
        width: '11em'
      }}
    >
        <p>Confidence Score: {confidenceScore}%</p>
        </Box>
    </Box>
  );
};
