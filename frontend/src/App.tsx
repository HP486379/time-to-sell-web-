import { Container, Box, Typography } from '@mui/material'
import DashboardPage from './components/DashboardPage'

function App() {
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
      </Box>
      <DashboardPage />
    </Container>
  )
}

export default App
