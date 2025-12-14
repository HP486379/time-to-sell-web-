import { Card, CardContent, Stack, Typography, Box, Button, useTheme, alpha, Tooltip, Divider } from '@mui/material'
import { darken } from '@mui/material/styles'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { TooltipTexts } from '../tooltipTexts'
import type { SimpleAlertLevel } from './UridokiKunAvatar'
import { AnimatedSignalLight, type SignalLevel } from './AnimatedSignalLight'

interface Props {
  scores?: {
    total: number
  }
  highlights?: { icon: string; text: string }[]
  zoneText?: string
  onShowDetails: () => void
  expanded: boolean
  tooltips: TooltipTexts
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
      title: '利確してOKな水準です',
      message: '株価は長期平均より大きく上振れています。利益確定を積極的に検討できるゾーンです。',
      color: '#E4F6E8',
      icon: '🟢',
      face: '😄',
      reaction: 'いまが利確チャンス。どこで収穫するか作戦会議しましょう。',
    }
  }
  if (score >= 60) {
    return {
      level: 'sell',
      title: '利益確定を検討できそうです',
      message: '株価は平均よりやや高め。部分的な利確やポジション整理を考えられるゾーンです。',
      color: '#F0F5E3',
      icon: '🟢',
      face: '🙂',
      reaction: '好調モード。少しだけ利益を確保しておくのも手です。',
    }
  }
  if (score >= 40) {
    return {
      level: 'hold',
      title: '今は様子見で大丈夫です',
      message: '株価と環境は平均的。慌てず動向を見守るフェーズです。',
      color: '#FFF7E0',
      icon: '🟡',
      face: '( ˘ω˘ )',
      reaction: '穏やかなレンジ。タイミングを待ちましょう。',
    }
  }
  return {
    level: 'buy',
    title: 'まだ売らずに保有寄りです',
    message: '株価は割安寄り。中長期ではホールドや買い増しで育てる局面です。',
    color: '#F7E6E6',
    icon: '🔴',
    face: '😌',
    reaction: '熟成中のゾーン。じっくり寝かせて育てましょう。',
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

function SimpleAlertCard({
  scores,
  highlights = [],
  zoneText,
  onShowDetails,
  expanded,
  tooltips,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const alert = getAlert(scores?.total)
  const cardBackground = isDark ? '#2b2f38' : darken(alert.color, 0.04)
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.text.primary, 0.1)
  const textPrimary = isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.85)'
  const textSecondary = isDark ? '#d2d2d2' : 'rgba(0, 0, 0, 0.75)'
  const signalLevel: SignalLevel = scores?.total === undefined
    ? 'hold'
    : scores.total >= 70
      ? 'sell'
      : scores.total <= 30
        ? 'buy'
        : 'hold'

  return (
    <Card
      sx={{
        background: cardBackground,
        border: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? '0 14px 40px rgba(0, 0, 0, 0.38)'
          : `0 12px 30px ${alpha(theme.palette.text.primary, 0.08)}`,
      }}
    >
      <CardContent>
        <Stack spacing={2.25}>
          <Tooltip title={tooltips.simple.alert} arrow>
            <Typography variant="overline" color={textSecondary}>
              シンプル・アラート
            </Typography>
          </Tooltip>
          <Stack direction="row" alignItems="center" spacing={2.25}>
            <AnimatedSignalLight level={signalLevel} />
            <Stack spacing={0.75} flex={1}>
              <Typography variant="h6" fontWeight={700} color={textPrimary}>
                {alert.title}
              </Typography>
              <Typography variant="body2" color={textSecondary}>
                {alert.reaction}
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="body1" color={textPrimary}>
            {alert.message}
          </Typography>
          <Typography variant="body2" color={textSecondary}>
            {zoneText ?? getScoreZoneText(scores?.total)}
          </Typography>
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
                <Typography variant="subtitle2" color={textSecondary} gutterBottom>
                  今日のポイント
                </Typography>
              </Tooltip>
              <Stack spacing={1}>
                {highlights.map((h, idx) => (
                  <Stack direction="row" spacing={1} alignItems="flex-start" key={`${h.icon}-${idx}`}>
                    <Typography variant="body1" component="span" aria-hidden>
                      {h.icon}
                    </Typography>
                    <Typography variant="body2" component="span" color={textPrimary}>
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
