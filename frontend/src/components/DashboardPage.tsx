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
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import axios from 'axios'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import {
  EvaluateRequest,
  EvaluateResponse,
  FundNavResponse,
  SyntheticNavResponse,
  PricePoint,
} from '../types/api'
import ScoreSummaryCard from './ScoreSummaryCard'
import PositionForm from './PositionForm'
import PriceChart from './PriceChart'
import MacroCards from './MacroCards'
import EventList from './EventList'
import { buildTooltips } from '../tooltipTexts'
import RefreshIcon from '@mui/icons-material/Refresh'
import SimpleAlertCard from './SimpleAlertCard'
import UridokiKunAvatar from './UridokiKunAvatar'
import { INDEX_LABELS, PRICE_TITLE_MAP, type IndexType } from '../types/index'

const apiBase =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')

const apiClient = axios.create({
  baseURL: apiBase,
})

const defaultRequest: EvaluateRequest = {
  total_quantity: 77384,
  avg_cost: 21458,
  index_type: 'SP500',
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

type DisplayMode = 'pro' | 'simple'
type ChartRange = '60m' | '1d' | '1m' | '3m' | '6m' | '1y' | '5y'

const motionVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const chartMotion = {
  initial: { opacity: 0.6 },
  animate: { opacity: 1 },
  exit: { opacity: 0.6 },
}

function DashboardPage({ displayMode }: { displayMode: DisplayMode }) {
  const [response, setResponse] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syntheticNav, setSyntheticNav] = useState<SyntheticNavResponse | null>(null)
  const [fundNav, setFundNav] = useState<FundNavResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<EvaluateRequest>(defaultRequest)
  const [indexType, setIndexType] = useState<IndexType>('SP500')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [chartRange, setChartRange] = useState<ChartRange>('1y')
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [priceSeries, setPriceSeries] = useState<PricePoint[]>([])
  const tooltipTexts = useMemo(() => buildTooltips(indexType), [indexType])

  const fetchData = async (payload?: Partial<EvaluateRequest>) => {
    try {
      setError(null)
      const body = { ...lastRequest, ...(payload ?? {}), index_type: indexType }
      const res = await apiClient.post<EvaluateResponse>('/api/sp500/evaluate', body)
      setResponse(res.data)
      setLastUpdated(new Date())
      if (payload) setLastRequest((prev) => ({ ...prev, ...payload, index_type: indexType }))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const getPriceHistoryEndpoint = (targetIndex: IndexType) => {
    const map: Record<IndexType, string> = {
      SP500: '/api/sp500/price-history',
      TOPIX: '/api/topix/price-history',
      NIKKEI: '/api/nikkei/price-history',
      NIFTY50: '/api/nifty50/price-history',
      ORUKAN: '/api/orukan/price-history',
      orukan_jpy: '/api/orukan-jpy/price-history',
    }
    return map[targetIndex]
  }

  const fetchPriceSeries = async (targetIndex: IndexType) => {
    try {
      const res = await apiClient.get<PricePoint[]>(getPriceHistoryEndpoint(targetIndex))
      setPriceSeries(res.data)
    } catch (e: any) {
      console.error('価格履歴取得に失敗しました', e)
    }
  }

  const fetchNavs = async () => {
    if (indexType !== 'SP500') {
      setSyntheticNav(null)
      setFundNav(null)
      return
    }
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
    fetchPriceSeries(indexType)
    fetchNavs()
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [lastRequest, indexType])

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '未更新'
    return lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }, [lastUpdated])

  const filteredSeries = useMemo(() => filterPriceSeries(priceSeries, chartRange), [priceSeries, chartRange])

  const highlights = useMemo(() => buildHighlights(response), [response])

  const zoneText = useMemo(() => getScoreZoneText(response?.scores?.total), [response?.scores?.total])

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="index-select-label">対象インデックス</InputLabel>
          <Select
            labelId="index-select-label"
            value={indexType}
            label="対象インデックス"
            onChange={(e) => setIndexType(e.target.value as IndexType)}
          >
            {(Object.keys(INDEX_LABELS) as IndexType[]).map((key) => (
              <MenuItem key={key} value={key}>
                {INDEX_LABELS[key]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label={`最終更新: ${lastUpdatedLabel}`} size="small" />
          <Tooltip title="最新データを取得" arrow>
            <IconButton color="primary" onClick={() => fetchAll()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} md={8}>
          <AnimatePresence mode="wait">
            <motion.div key={displayMode} variants={motionVariants} initial="initial" animate="animate" exit="exit">
              {displayMode === 'simple' ? (
                <Stack spacing={2}>
                  <SimpleAlertCard
                    scores={response?.scores}
                    marketValue={response?.market_value}
                    pnl={response?.unrealized_pnl}
                    highlights={highlights}
                    zoneText={zoneText}
                    onShowDetails={() => setShowDetails((prev) => !prev)}
                    expanded={showDetails}
                    tooltips={tooltipTexts}
                  />
                  <Collapse in={showDetails}>
                    <ScoreSummaryCard
                      scores={response?.scores}
                      technical={response?.technical_details}
                      macro={response?.macro_details}
                      tooltips={tooltipTexts}
                    />
                  </Collapse>
                </Stack>
              ) : (
                <ScoreSummaryCard
                  scores={response?.scores}
                  technical={response?.technical_details}
                  macro={response?.macro_details}
                  tooltips={tooltipTexts}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Box textAlign="center">
              <UridokiKunAvatar level={getAvatarLevel(response?.scores?.total)} size={220} animated />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                売り時くん
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Tooltip title={tooltipTexts.chart.title} arrow>
            <Typography variant="h6" gutterBottom component="div">
              {PRICE_TITLE_MAP[indexType]}
            </Typography>
          </Tooltip>
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <ToggleButtonGroup
              value={chartRange}
              exclusive
              size="small"
              onChange={(_, val) => val && setChartRange(val)}
            >
              <ToggleButton value="60m">60分</ToggleButton>
              <ToggleButton value="1d">1日</ToggleButton>
              <ToggleButton value="1m">1ヶ月</ToggleButton>
              <ToggleButton value="3m">3ヶ月</ToggleButton>
              <ToggleButton value="6m">6ヶ月</ToggleButton>
              <ToggleButton value="1y">1年</ToggleButton>
              <ToggleButton value="5y">5年</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <AnimatePresence mode="wait">
            <motion.div key={`${chartRange}-${displayMode}`} variants={chartMotion} initial="initial" animate="animate" exit="exit">
              <PriceChart priceSeries={filteredSeries} simple={displayMode === 'simple'} tooltips={tooltipTexts} />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <MacroCards macroDetails={response?.macro_details} tooltips={tooltipTexts} />
        </Grid>
        <Grid item xs={12} md={5}>
          <EventList eventDetails={response?.event_details} tooltips={tooltipTexts} />
        </Grid>
      </Grid>

      <Box position="fixed" bottom={24} right={24} zIndex={(theme) => theme.zIndex.tooltip}>
        <Tooltip title="あなたのポジションで試算（任意）" arrow>
          <Button variant="contained" color="secondary" onClick={() => setPositionDialogOpen(true)}>
            マイポジ試算（任意）
          </Button>
        </Tooltip>
      </Box>

      <Dialog open={positionDialogOpen} onClose={() => setPositionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>マイポジ試算</DialogTitle>
        <DialogContent dividers>
          <PositionForm
            onSubmit={(req) => {
              fetchData(req)
              setPositionDialogOpen(false)
            }}
            marketValue={response?.market_value}
            pnl={response?.unrealized_pnl}
            syntheticNav={syntheticNav}
            fundNav={fundNav}
            tooltips={tooltipTexts}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPositionDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function filterPriceSeries(series: PricePoint[], range: ChartRange): PricePoint[] {
  if (!series.length) return []
  const lastDate = dayjs(series[series.length - 1].date)
  let fromDate = lastDate.subtract(1, 'year')

  switch (range) {
    case '60m':
      fromDate = lastDate.subtract(60, 'minute')
      break
    case '1d':
      fromDate = lastDate.subtract(1, 'day')
      break
    case '1m':
      fromDate = lastDate.subtract(1, 'month')
      break
    case '3m':
      fromDate = lastDate.subtract(3, 'month')
      break
    case '6m':
      fromDate = lastDate.subtract(6, 'month')
      break
    case '5y':
      fromDate = lastDate.subtract(5, 'year')
      break
    case '1y':
    default:
      fromDate = lastDate.subtract(1, 'year')
      break
  }

  return series.filter((p) => {
    const current = dayjs(p.date)
    return current.isAfter(fromDate) || current.isSame(fromDate, 'day')
  })
}

function getScoreZoneText(score?: number) {
  if (score === undefined) return 'スコアの計算中です。'
  if (score >= 80) return '現在のスコアは「かなり高い水準」です。'
  if (score >= 60) return '現在のスコアは「やや高めの水準」です。'
  if (score >= 40) return '現在のスコアは「平均的な水準」です。'
  if (score >= 20) return '現在のスコアは「やや低めの水準」です。'
  return '現在のスコアは「かなり低い水準」です。'
}

function getAvatarLevel(score?: number): 'strong-sell' | 'sell' | 'hold' | 'buy' {
  if (score === undefined) return 'hold'
  if (score >= 80) return 'strong-sell'
  if (score >= 60) return 'sell'
  if (score >= 40) return 'hold'
  return 'buy'
}

function buildHighlights(response: EvaluateResponse | null): { icon: string; text: string }[] {
  if (!response) return []
  const highlights: { icon: string; text: string }[] = []
  const { technical_details: technical, macro_details: macro, event_details: event, unrealized_pnl, market_value } = response
  const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 })

  if (technical?.d !== undefined) {
    if (technical.d >= 15) {
      highlights.push({ icon: '📈', text: '株価は長期平均よりかなり高い位置にあります。' })
    } else if (technical.d >= 5) {
      highlights.push({ icon: '📈', text: '株価は長期平均よりやや高い位置にあります。' })
    } else if (technical.d <= -5) {
      highlights.push({ icon: '📉', text: '株価は長期平均より低めの位置にあります。' })
    } else {
      highlights.push({ icon: '➖', text: '株価は長期平均に近い水準にあります。' })
    }
  }

  if (macro?.M !== undefined) {
    if (macro.M >= 70) {
      highlights.push({ icon: '💹', text: '金利やインフレなどの環境は、株式にとってやや逆風です。' })
    } else if (macro.M >= 50) {
      highlights.push({ icon: '💹', text: 'マクロ環境はやや注意が必要な水準です。' })
    } else {
      highlights.push({ icon: '🌤️', text: 'マクロ環境は比較的落ち着いています。' })
    }
  }

  if (event?.effective_event && event.E_adj !== 0) {
    highlights.push({
      icon: '⏰',
      text: `今週は「${event.effective_event.name}」が予定されており、発表前後は値動きが大きくなる可能性があります。`,
    })
  } else {
    highlights.push({ icon: '📆', text: '直近で特別に大きなイベントは予定されていません。' })
  }

  if (unrealized_pnl !== undefined && market_value !== undefined) {
    const costBasis = market_value - unrealized_pnl
    const ratio = costBasis ? (unrealized_pnl / costBasis) * 100 : 0
    if (unrealized_pnl > 0) {
      highlights.push({
        icon: '💰',
        text: `現在の含み益はおよそ ${formatter.format(unrealized_pnl)}（${ratio.toFixed(1)}%）です。`,
      })
    } else if (unrealized_pnl < 0) {
      highlights.push({
        icon: '📊',
        text: `現在の含み損はおよそ ${formatter.format(unrealized_pnl)}（${ratio.toFixed(1)}%）です。`,
      })
    } else {
      highlights.push({ icon: '⚖️', text: '現在の含み損益はほぼプラスマイナスゼロです。' })
    }
  }

  return highlights.slice(0, 4)
}

export default DashboardPage
