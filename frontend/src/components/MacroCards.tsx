import { Card, CardContent, Grid, Typography, Box, Chip } from '@mui/material'

interface Props {
  macroDetails?: {
    p_r: number
    p_cpi: number
    p_vix: number
    M: number
  }
}

const macroInfo = [
  { key: 'p_r', title: '米10年債利回り', color: '#f97316', desc: ['低め', 'ふつう', '高め'] },
  { key: 'p_cpi', title: 'インフレ (CPI)', color: '#a855f7', desc: ['鈍化', '中立', '加速'] },
  { key: 'p_vix', title: 'VIX', color: '#22d3ee', desc: ['穏やか', '注意', '警戒'] },
]

function MacroCards({ macroDetails }: Props) {
  return (
    <Grid container spacing={2}>
      {macroInfo.map((item) => {
        const percentile = macroDetails ? macroDetails[item.key as keyof typeof macroDetails] : undefined
        const labelIndex = percentile !== undefined ? Math.min(2, Math.floor(percentile * 3)) : 1
        return (
          <Grid item xs={12} sm={4} key={item.key}>
            <Card sx={{ background: 'linear-gradient(180deg,#0f172a,#0b1224)' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {item.title}
                </Typography>
                <Typography variant="h5" color={item.color} fontWeight={700}>
                  {(percentile ?? 0).toFixed(2)} pct
                </Typography>
                <Box mt={1}>
                  <Chip label={item.desc[labelIndex]} sx={{ color: item.color, borderColor: item.color }} variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default MacroCards
