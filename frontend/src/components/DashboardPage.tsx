import { useEffect, useState } from 'react'
import { Grid, Card, CardContent, Typography, Stack, Alert } from '@mui/material'
import axios from 'axios'
import { EvaluateRequest, EvaluateResponse } from '../types/api'
import ScoreSummaryCard from './ScoreSummaryCard'
import PositionForm from './PositionForm'
import PriceChart from './PriceChart'
import MacroCards from './MacroCards'
import EventList from './EventList'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
})

const defaultRequest: EvaluateRequest = {
  total_quantity: 10,
  avg_cost: 4200,
}

function DashboardPage() {
  const [response, setResponse] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (payload: EvaluateRequest = defaultRequest) => {
    try {
      setError(null)
      const res = await apiClient.post<EvaluateResponse>('/api/sp500/evaluate', payload)
      setResponse(res.data)
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ScoreSummaryCard scores={response?.scores} technical={response?.technical_details} macro={response?.macro_details} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PositionForm onSubmit={fetchData} marketValue={response?.market_value} pnl={response?.unrealized_pnl} />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            S&P500 価格トレンド
          </Typography>
          <PriceChart />
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <MacroCards macroDetails={response?.macro_details} />
        </Grid>
        <Grid item xs={12} md={5}>
          <EventList eventDetails={response?.event_details} />
        </Grid>
      </Grid>
    </Stack>
  )
}

export default DashboardPage
