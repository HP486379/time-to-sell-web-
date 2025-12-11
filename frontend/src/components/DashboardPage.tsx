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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
type StartOption = '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'max' | 'custom'
type PriceDisplayMode = 'normalized' | 'actual'

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
  const [responses, setResponses] = useState<Partial<Record<IndexType, EvaluateResponse>>>({})
  const [error, setError] = useState<string | null>(null)
  const [syntheticNav, setSyntheticNav] = useState<SyntheticNavResponse | null>(null)
  const [fundNav, setFundNav] = useState<FundNavResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<EvaluateRequest>(defaultRequest)
  const [indexType, setIndexType] = useState<IndexType>('SP500')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [startOption, setStartOption] = useState<StartOption>('max')
  const [customStart, setCustomStart] = useState('')
  const [priceDisplayMode, setPriceDisplayMode] = useState<PriceDisplayMode>('normalized')
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [priceSeriesMap, setPriceSeriesMap] = useState<Partial<Record<IndexType, PricePoint[]>>>({})

  const tooltipTexts = useMemo(() => buildTooltips(indexType), [indexType])

  const response = responses[indexType] ?? null
  const priceSeries = priceSeriesMap[indexType] ?? []

  const fetchEvaluation = async (
    targetIndex: IndexType,
    payload?: Partial<EvaluateRequest>,
    markPrimary = false,
  ) => {
    try {
      const body = { ...lastRequest, ...(payload ?? {}), index_type: targetIndex }
      if (markPrimary) setError(null)
      const res = await apiClient.post<EvaluateResponse>('/api/sp500/evaluate', body)
      setResponses((prev) => ({ ...prev, [targetIndex]: res.data }))
      if (targetIndex === indexType && payload) setLastRequest((prev) => ({ ...prev, ...payload, index_type: targetIndex }))
      if (markPrimary) setLastUpdated(new Date())
    } catch (e: any) {
      if (markPrimary) {
        setError(e.message)
      } else {
        console.error('評価の取得に失敗しました', e)
      }
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
      setPriceSeriesMap((prev) => ({ ...prev, [targetIndex]: res.data }))
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
    const targets: IndexType[] =
      indexType === 'ORUKAN' || indexType === 'orukan_jpy'
        ? ['ORUKAN', 'orukan_jpy']
        : [indexType]

    targets.forEach((target) => {
      const isPrimary = target === indexType
      fetchEvaluation(target, undefined, isPrimary)
      fetchPriceSeries(target)
    })
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

  const filteredSeries = useMemo(
    () => filterPriceSeries(priceSeries, startOption, customStart),
    [priceSeries, startOption, customStart],
  )

  const normalizedSeries = useMemo(() => normalizePriceSeries(filteredSeries), [filteredSeries])

  const displaySeries = priceDisplayMode === 'normalized' ? normalizedSeries : filteredSeries

  const highlights = useMemo(() => buildHighlights(response), [response])

  const zoneText = useMemo(() => getScoreZoneText(response?.scores?.total), [response?.scores?.total])

  const totalReturnLabels = useMemo(
    () => buildReturnLabels(indexType, priceSeriesMap),
    [indexType, priceSeriesMap],
  )

  const forexInsight = useMemo(
    () => buildForexInsight(indexType, responses),
    [indexType, responses],
  )

  useEffect(() => {
    if (startOption === 'custom' && !customStart && priceSeries.length) {
      setCustomStart(priceSeries[0].date)
    }
  }, [startOption, customStart, priceSeries])

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
          {totalReturnLabels.length > 0 && (
            <Stack spacing={0.5} mb={2} mt={-0.5}>
              {totalReturnLabels.map((label) => (
                <Typography key={label} variant="body2" color="text.secondary">
                  {label}
                </Typography>
              ))}
            </Stack>
          )}
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="price-display-mode-label">表示モード</InputLabel>
              <Select
                labelId="price-display-mode-label"
                value={priceDisplayMode}
                label="表示モード"
                onChange={(e) => setPriceDisplayMode(e.target.value as PriceDisplayMode)}
              >
                <MenuItem value="normalized">正規化</MenuItem>
                <MenuItem value="actual">実価格</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="start-select-label">開始時点</InputLabel>
              <Select
                labelId="start-select-label"
                value={startOption}
                label="開始時点"
                onChange={(e) => setStartOption(e.target.value as StartOption)}
              >
                <MenuItem value="max">全期間</MenuItem>
                <MenuItem value="1m">1ヶ月前</MenuItem>
                <MenuItem value="3m">3ヶ月前</MenuItem>
                <MenuItem value="6m">6ヶ月前</MenuItem>
                <MenuItem value="1y">1年前</MenuItem>
                <MenuItem value="3y">3年前</MenuItem>
                <MenuItem value="5y">5年前</MenuItem>
                <MenuItem value="custom">日付を指定</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="開始日を指定"
              type="date"
              size="small"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              disabled={startOption !== 'custom'}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${startOption}-${customStart}-${displayMode}-${priceDisplayMode}`}
              variants={chartMotion}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <PriceChart priceSeries={displaySeries} simple={displayMode === 'simple'} tooltips={tooltipTexts} />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {forexInsight && (indexType === 'ORUKAN' || indexType === 'orukan_jpy') && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              為替インサイト
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Chip label={`スコア差: ${forexInsight.diff.toFixed(1)}pt`} color="info" size="small" />
              <Typography variant="body2" color="text.secondary">
                {forexInsight.message}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

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
              fetchEvaluation(indexType, req, true)
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

function filterPriceSeries(series: PricePoint[], startOption: StartOption, customStart: string): PricePoint[] {
  if (!series.length) return []

  const startDate = resolveStartDate(series, startOption, customStart)
  return startDate
    ? series.filter((p) => {
        const current = dayjs(p.date)
        return current.isAfter(startDate) || current.isSame(startDate, 'day')
      })
    : series
}

function normalizePriceSeries(series: PricePoint[]): PricePoint[] {
  if (!series.length) return []

  const basePrice = series[0].close
  if (basePrice === 0) return series
  const factor = 100 / basePrice

  return series.map((p) => ({
    ...p,
    close: roundToTwo(p.close * factor),
    ma20: p.ma20 !== null ? roundToTwo(p.ma20 * factor) : null,
    ma60: p.ma60 !== null ? roundToTwo(p.ma60 * factor) : null,
    ma200: p.ma200 !== null ? roundToTwo(p.ma200 * factor) : null,
  }))
}

function resolveStartDate(series: PricePoint[], startOption: StartOption, customStart: string) {
  if (!series.length) return null
  const lastDate = dayjs(series[series.length - 1].date)

  switch (startOption) {
    case '1m':
      return lastDate.subtract(30, 'day')
    case '3m':
      return lastDate.subtract(90, 'day')
    case '6m':
      return lastDate.subtract(180, 'day')
    case '1y':
      return lastDate.subtract(365, 'day')
    case '3y':
      return lastDate.subtract(3 * 365, 'day')
    case '5y':
      return lastDate.subtract(5 * 365, 'day')
    case 'custom': {
      const parsed = dayjs(customStart)
      if (parsed.isValid()) return parsed
      return dayjs(series[0].date)
    }
    case 'max':
    default:
      return dayjs(series[0].date)
  }
}

function buildReturnLabels(indexType: IndexType, priceSeriesMap: Partial<Record<IndexType, PricePoint[]>>): string[] {
  const labels: string[] = []
  const usdSeries = priceSeriesMap.ORUKAN ?? []
  const jpySeries = priceSeriesMap.orukan_jpy ?? []

  if (indexType === 'orukan_jpy') {
    const usdReturn = calculateTotalReturn(usdSeries)
    const jpyReturn = calculateTotalReturn(jpySeries)
    if (usdReturn !== null) labels.push(`ドル建て  ：5年トータル ${formatPercentage(usdReturn)}`)
    if (jpyReturn !== null) labels.push(`円建て    ：5年トータル ${formatPercentage(jpyReturn)}`)
    return labels
  }

  const baseSeries = indexType === 'ORUKAN' ? usdSeries : priceSeriesMap[indexType]
  const ret = calculateTotalReturn(baseSeries ?? [])
  if (ret !== null) labels.push(`${getCurrencyLabel(indexType)} ：5年トータル ${formatPercentage(ret)}`)
  return labels
}

function calculateTotalReturn(series: PricePoint[], years = 5): number | null {
  if (!series.length) return null
  const latest = series[series.length - 1]
  const targetDate = dayjs(latest.date).subtract(years, 'year')
  const past = series.find((p) => !dayjs(p.date).isBefore(targetDate, 'day'))
  if (!past) return null
  if (past.close === 0) return null
  return ((latest.close / past.close - 1) * 100)
}

function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function getCurrencyLabel(indexType: IndexType): 'ドル建て' | '円建て' {
  if (indexType === 'TOPIX' || indexType === 'NIKKEI') return '円建て'
  return 'ドル建て'
}

function buildForexInsight(
  indexType: IndexType,
  responses: Partial<Record<IndexType, EvaluateResponse>>,
): { diff: number; message: string } | null {
  if (indexType !== 'ORUKAN' && indexType !== 'orukan_jpy') return null
  const usd = responses.ORUKAN
  const jpy = responses.orukan_jpy
  if (!usd || !jpy) return null

  const usdScore = usd.scores?.total ?? 0
  const jpyScore = jpy.scores?.total ?? 0
  const diff = jpyScore - usdScore

  if (diff > 5) {
    return {
      diff,
      message: '為替の影響で上振れしています。円安が進んだため、円建て評価額が押し上げられています。',
    }
  }
  if (diff < -5) {
    return {
      diff,
      message: '株価は上昇していますが、円高により円建てでは利益が削られています。為替による下押しが発生しています。',
    }
  }
  return {
    diff,
    message: 'ドル建てと円建ての動きはほぼ一致しています。為替の影響は小さく、中立的です。',
  }
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
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
