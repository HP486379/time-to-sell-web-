import { useEffect, useMemo, useState } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  Tooltip,
  Box,
  IconButton,
  Collapse,
  Chip,
} from '@mui/material'
import axios from 'axios'
import { EvaluateRequest, EvaluateResponse, FundNavResponse, SyntheticNavResponse } from '../types/api'
import ScoreSummaryCard from './ScoreSummaryCard'
import PositionForm from './PositionForm'
import PriceChart from './PriceChart'
import MacroCards from './MacroCards'
import EventList from './EventList'
import { tooltips } from '../tooltipTexts'
import RefreshIcon from '@mui/icons-material/Refresh'
import SimpleAlertCard from './SimpleAlertCard'

const apiBase =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')

const apiClient = axios.create({
  baseURL: apiBase,
})

const defaultRequest: EvaluateRequest = {
  total_quantity: 77384,
  avg_cost: 21458,
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

type DisplayMode = 'pro' | 'simple'

function DashboardPage({ displayMode }: { displayMode: DisplayMode }) {
  const [response, setResponse] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syntheticNav, setSyntheticNav] = useState<SyntheticNavResponse | null>(null)
  const [fundNav, setFundNav] = useState<FundNavResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<EvaluateRequest>(defaultRequest)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchData = async (payload?: EvaluateRequest) => {
    try {
      setError(null)
      const body = payload ?? lastRequest
      const res = await apiClient.post<EvaluateResponse>('/api/sp500/evaluate', body)
      setResponse(res.data)
      setLastUpdated(new Date())
      if (payload) setLastRequest(payload)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const fetchNavs = async () => {
    try {
      const [syntheticRes, fundRes] = await Promise.all([
        apiClient.get<SyntheticNavResponse>('/api/nav/sp500-synthetic').catch(() => null),
        apiClient.get<FundNavResponse>('/api/nav/emaxis-slim-sp500').catch(() => null),
      ])
      setSyntheticNav(syntheticRes?.data ?? null)
      setFundNav(fundRes?.data ?? null)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAll = () => {
    fetchData()
    fetchNavs()
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [lastRequest])

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '未更新'
    return lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }, [lastUpdated])

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
        <Chip label={`最終更新: ${lastUpdatedLabel}`} size="small" />
        <Tooltip title="最新データを取得" arrow>
          <IconButton color="primary" onClick={() => fetchAll()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {displayMode === 'simple' ? (
            <Stack spacing={2}>
              <SimpleAlertCard
                scores={response?.scores}
                marketValue={response?.market_value}
                pnl={response?.unrealized_pnl}
                onShowDetails={() => setShowDetails((prev) => !prev)}
                expanded={showDetails}
              />
              <Collapse in={showDetails}>
                <ScoreSummaryCard
                  scores={response?.scores}
                  technical={response?.technical_details}
                  macro={response?.macro_details}
                />
              </Collapse>
            </Stack>
          ) : (
            <ScoreSummaryCard
              scores={response?.scores}
              technical={response?.technical_details}
              macro={response?.macro_details}
            />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <PositionForm
            onSubmit={fetchData}
            marketValue={response?.market_value}
            pnl={response?.unrealized_pnl}
            syntheticNav={syntheticNav}
            fundNav={fundNav}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Tooltip title={tooltips.chart.title} arrow>
            <Typography variant="h6" gutterBottom component="div">
              S&P500 価格トレンド
            </Typography>
          </Tooltip>
          <PriceChart priceSeries={response?.price_series ?? []} simple={displayMode === 'simple'} />
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
