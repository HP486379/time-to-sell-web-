import {
  Container,
  Box,
  Typography,
  Switch,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from '@mui/material'
import { useState } from 'react'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { PaletteMode } from '@mui/material'
import { Routes, Route, Link } from 'react-router-dom'
import DashboardPage from './components/DashboardPage'
import BacktestPage from './components/BacktestPage'

interface AppProps {
  mode: PaletteMode
  onToggleMode: () => void
}

function App({ mode, onToggleMode }: AppProps) {
  const [displayMode, setDisplayMode] = useState<'pro' | 'simple'>('pro')

  const handleDisplayMode = (_: any, next: 'pro' | 'simple') => {
    if (next) setDisplayMode(next)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.light">
            S&P500 売り時ダッシュボード v1
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            テクニカル・マクロ・イベントの三軸で売り時スコアを可視化
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button component={Link} to="/" variant="text" color="inherit">
            ダッシュボード
          </Button>
          <Button component={Link} to="/backtest" variant="outlined" color="secondary">
            バックテスト専用
          </Button>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              表示モード
            </Typography>
            <ToggleButtonGroup value={displayMode} exclusive size="small" onChange={handleDisplayMode}>
              <ToggleButton value="pro">プロ向け</ToggleButton>
              <ToggleButton value="simple">かんたん</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <LightModeIcon color={mode === 'light' ? 'primary' : 'disabled'} />
            <Switch checked={mode === 'dark'} onChange={onToggleMode} color="primary" />
            <DarkModeIcon color={mode === 'dark' ? 'primary' : 'disabled'} />
          </Stack>
        </Stack>
      </Box>
      <Routes>
        <Route path="/" element={<DashboardPage displayMode={displayMode} />} />
        <Route path="/backtest" element={<BacktestPage />} />
      </Routes>
    </Container>
  )
}

export default App
