import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7dd3fc',
    },
    secondary: {
      main: '#a78bfa',
    },
    background: {
      default: '#0b1224',
      paper: '#121b2f',
    },
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans JP", sans-serif',
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
