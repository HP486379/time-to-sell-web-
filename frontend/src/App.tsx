import { Container, Box, Typography, Switch, Stack } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { PaletteMode } from '@mui/material'
import DashboardPage from './components/DashboardPage'

interface AppProps {
  mode: PaletteMode
  onToggleMode: () => void
}

function App({ mode, onToggleMode }: AppProps) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.light">
            S&P500 売り時ダッシュボード v1
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            テクニカル・マクロ・イベントの三軸で売り時スコアを可視化
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <LightModeIcon color={mode === 'light' ? 'primary' : 'disabled'} />
          <Switch checked={mode === 'dark'} onChange={onToggleMode} color="primary" />
          <DarkModeIcon color={mode === 'dark' ? 'primary' : 'disabled'} />
        </Stack>
      </Box>
      <DashboardPage />
    </Container>
  )
}

export default App
