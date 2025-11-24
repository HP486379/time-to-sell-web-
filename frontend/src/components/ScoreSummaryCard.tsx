import { Card, CardContent, Typography, LinearProgress, Stack, Box } from '@mui/material'

interface ScoreSummaryCardProps {
  scores?: {
    technical: number
    macro: number
    event_adjustment: number
    total: number
    label: string
  }
  technical?: { d: number; T_base: number; T_trend: number }
  macro?: { p_r: number; p_cpi: number; p_vix: number; M: number }
}

function ScoreSummaryCard({ scores, technical, macro }: ScoreSummaryCardProps) {
  return (
    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #101726, #0c1b34)' }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            総合スコア
          </Typography>
          <Typography variant="h3" color="primary.main" fontWeight={700}>
            {scores ? scores.total.toFixed(1) : '--'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {scores?.label ?? '計算待ち'}
          </Typography>

          <Stack spacing={1}>
            <LabelBar label="テクニカル" value={scores?.technical} color="primary" />
            <LabelBar label="マクロ" value={scores?.macro} color="secondary" />
            <LabelBar label="イベント補正" value={scores?.event_adjustment} color="error" />
          </Stack>

          {technical && macro && (
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={1}>
              <DetailItem label="乖離率 d" value={`${technical.d}%`} />
              <DetailItem label="T_base" value={technical.T_base} />
              <DetailItem label="T_trend" value={technical.T_trend} />
              <DetailItem label="マクロ M" value={macro.M} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function LabelBar({ label, value, color }: { label: string; value?: number; color: 'primary' | 'secondary' | 'error' }) {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color={`${color}.light`}>
          {value !== undefined ? value.toFixed(1) : '--'}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={value ? Math.min(Math.max(value, 0), 100) : 0} color={color} />
    </Box>
  )
}

function DetailItem({ label, value }: { label: string; value: number | string }) {
  return (
    <Box bgcolor="rgba(255,255,255,0.04)" p={1} borderRadius={1}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  )
}

export default ScoreSummaryCard
