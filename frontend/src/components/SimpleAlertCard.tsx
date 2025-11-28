import { Card, CardContent, Stack, Typography, Box, Button, useTheme, alpha, Tooltip } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { tooltips } from '../tooltipTexts'

interface Props {
  scores?: {
    total: number
  }
  marketValue?: number
  pnl?: number
  onShowDetails: () => void
  expanded: boolean
}

interface AlertLevel {
  level: 'strong-sell' | 'sell' | 'hold' | 'buy'
  title: string
  message: string
  color: string
  icon: string
}

const getAlert = (score = 0): AlertLevel => {
  if (score >= 80) {
    return {
      level: 'strong-sell',
      title: 'かなり売り時です',
      message: '株価が長期平均よりかなり高く、金利やインフレもやや高めの状態です。',
      color: '#ef4444',
      icon: '⚠️',
    }
  }
  if (score >= 60) {
    return {
      level: 'sell',
      title: 'そろそろ一部売ってもよさそうです',
      message: '株価はやや高めで、今後の値動き次第では調整する可能性もあります。',
      color: '#f97316',
      icon: '🟧',
    }
  }
  if (score >= 40) {
    return {
      level: 'hold',
      title: '今は様子見で大丈夫です',
      message: '株価と景気のバランスは平均的で、急いで動く局面ではありません。',
      color: '#3b82f6',
      icon: '🟦',
    }
  }
  return {
    level: 'buy',
    title: 'まだ売り時ではありません',
    message: '株価が割安寄りで、長期投資では保有や買い増しも検討できる状態です。',
    color: '#22c55e',
    icon: '🟩',
  }
}

function SimpleAlertCard({ scores, marketValue, pnl, onShowDetails, expanded }: Props) {
  const theme = useTheme()
  const alert = getAlert(scores?.total)
  const baseColor = alert.color
  const costBasis = marketValue !== undefined && pnl !== undefined ? marketValue - pnl : undefined
  const pnlPct = costBasis && costBasis !== 0 ? (pnl! / costBasis) * 100 : null
  const jpyFormatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  })

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(baseColor, 0.12)}, ${alpha(baseColor, 0.24)})`,
        border: `1px solid ${alpha(baseColor, 0.35)}`,
        boxShadow: `0 10px 30px ${alpha(baseColor, 0.2)}`,
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Tooltip title={tooltips.simple.alert} arrow>
            <Typography variant="overline" color="text.secondary">
              シンプル・アラート
            </Typography>
          </Tooltip>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h3">{alert.icon}</Typography>
            <Typography variant="h5" fontWeight={700} color={baseColor}>
              {alert.title}
            </Typography>
          </Stack>
          <Typography variant="body1" color={theme.palette.text.primary}>
            {alert.message}
          </Typography>
          {pnl !== undefined && marketValue !== undefined && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.default, 0.35),
                border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
              }}
            >
              <Tooltip title={tooltips.simple.pnl} arrow>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  あなたの今の含み損益
                </Typography>
              </Tooltip>
              <Typography variant="h6" color={pnl >= 0 ? 'primary.main' : 'error.main'}>
                {jpyFormatter.format(pnl)}
                {pnlPct !== null && isFinite(pnlPct) && ` （${pnlPct.toFixed(1)}%）`}
              </Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            color="inherit"
            endIcon={<ArrowForwardIcon />}
            onClick={onShowDetails}
            sx={{ alignSelf: 'flex-start' }}
          >
            {expanded ? '閉じる' : 'くわしく見る ≫'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SimpleAlertCard
