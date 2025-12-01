import { Card, CardContent, Stack, Typography, Box, Button, useTheme, alpha, Tooltip, Divider } from '@mui/material'
import { keyframes } from '@mui/system'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { tooltips } from '../tooltipTexts'
import { UridokiKunAvatar, type SimpleAlertLevel } from './UridokiKunAvatar'

interface Props {
  scores?: {
    total: number
  }
  marketValue?: number
  pnl?: number
  highlights?: { icon: string; text: string }[]
  zoneText?: string
  onShowDetails: () => void
  expanded: boolean
}

interface AlertLevel {
  level: SimpleAlertLevel
  title: string
  message: string
  color: string
  icon: string
  face: string
  reaction: string
}

const getAlert = (score = 0): AlertLevel => {
  if (score >= 80) {
    return {
      level: 'strong-sell',
      title: 'かなり売り時です',
      message: '株価が長期平均よりかなり高く、金利やインフレも高めの状態です。大きめの調整が入る可能性もあります。',
      color: '#FFE5E5',
      icon: '⚠️',
      face: '(；ﾟДﾟ)',
      reaction: '今売らんで、いつ売るんですかレベルです…！',
    }
  }
  if (score >= 60) {
    return {
      level: 'sell',
      title: 'そろそろ一部売ってもよさそうです',
      message: '株価はやや高めで、今後の値動き次第では調整する可能性もあります。',
      color: '#FFEAD6',
      icon: '🟧',
      face: '😅',
      reaction: 'ちょっとホクホクしてきました。一部だけポケットに入れてもいいかも。',
    }
  }
  if (score >= 40) {
    return {
      level: 'hold',
      title: '今は様子見で大丈夫です',
      message: '株価と景気のバランスは平均的で、急いで動く局面ではありません。',
      color: '#E6F0FF',
      icon: '🟦',
      face: '( ˘ω˘ )',
      reaction: '今は静観タイム。お茶でも飲みながら見守りましょう。',
    }
  }
  return {
    level: 'buy',
    title: 'まだ売り時ではありません',
    message: '株価が割安寄りで、長期投資では保有や買い増しも検討できる状態です。',
    color: '#E4F6E8',
    icon: '🟩',
    face: '😎',
    reaction: '“バーゲンコーナー”の前を通りかかったぐらいの感じです。',
  }
}

const getScoreZoneText = (score?: number) => {
  if (score === undefined) return 'スコアの計算中です。'
  if (score >= 80) return '現在のスコアは「かなり高い水準」です。'
  if (score >= 60) return '現在のスコアは「やや高めの水準」です。'
  if (score >= 40) return '現在のスコアは「平均的な水準」です。'
  if (score >= 20) return '現在のスコアは「やや低めの水準」です。'
  return '現在のスコアは「かなり低い水準」です。'
}

function SimpleAlertCard({ scores, marketValue, pnl, highlights = [], zoneText, onShowDetails, expanded }: Props) {
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

  const shake = keyframes`
    0% { transform: translateX(0); }
    20% { transform: translateX(-2px); }
    40% { transform: translateX(2px); }
    60% { transform: translateX(-1px); }
    80% { transform: translateX(1px); }
    100% { transform: translateX(0); }
  `

  const bounce = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  `

  const faceAnimation =
    alert.level === 'strong-sell'
      ? `${shake} 0.8s ease-in-out 0s 3`
      : alert.level === 'buy'
        ? `${bounce} 1.2s ease-in-out 0s 3`
        : undefined

  return (
    <Card
      sx={{
        background: baseColor,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        boxShadow: `0 12px 30px ${alpha(theme.palette.text.primary, 0.08)}`,
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Tooltip title={tooltips.simple.alert} arrow>
            <Typography variant="overline" color="text.secondary">
              シンプル・アラート
            </Typography>
          </Tooltip>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              aria-hidden
              sx={{
                animation: faceAnimation,
              }}
            >
              <UridokiKunAvatar
                level={alert.level}
                animated={!!faceAnimation}
                label={`${alert.title}のビジュアル表示`}
              />
            </Box>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h3" component="span">
                  {alert.icon}
                </Typography>
                <Typography variant="h6" fontWeight={700} color={theme.palette.text.primary}>
                  {alert.title}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {alert.reaction}
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="body1" color={theme.palette.text.primary}>
            {alert.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {zoneText ?? getScoreZoneText(scores?.total)}
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
          {highlights.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.default, 0.35),
                border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              }}
            >
              <Tooltip title={tooltips.simple.points} arrow>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  今日のポイント
                </Typography>
              </Tooltip>
              <Stack spacing={1}>
                {highlights.map((h, idx) => (
                  <Stack direction="row" spacing={1} alignItems="flex-start" key={`${h.icon}-${idx}`}>
                    <Typography variant="body1" component="span" aria-hidden>
                      {h.icon}
                    </Typography>
                    <Typography variant="body2" component="span" color="text.primary">
                      {h.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
          <Divider light />
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
