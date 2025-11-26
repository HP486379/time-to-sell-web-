import { useState } from 'react'
import { Card, CardContent, TextField, Button, Stack, Typography, Box, Divider } from '@mui/material'
import { EvaluateRequest } from '../types/api'

interface Props {
  onSubmit: (req: EvaluateRequest) => void
  marketValue?: number
  pnl?: number
}

function PositionForm({ onSubmit, marketValue, pnl }: Props) {
  const [quantity, setQuantity] = useState('10')
  const [avgCost, setAvgCost] = useState('65000')

  const jpyFormatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ total_quantity: parseFloat(quantity), avg_cost: parseFloat(avgCost) })
  }

  return (
    <Card>
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Typography variant="h6">ポジション入力</Typography>
          <TextField
            label="保有数量"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            InputProps={{ inputProps: { min: 0, step: 0.1 } }}
          />
          <TextField
            label="平均取得単価（円）"
            type="number"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            InputProps={{ inputProps: { min: 0, step: 10 } }}
          />
          <Button type="submit" variant="contained" size="large">
            計算
          </Button>
          <Divider />
          <Box display="flex" gap={2}>
            <Metric label="評価額" value={marketValue} formatter={jpyFormatter} />
            <Metric
              label="含み損益"
              value={pnl}
              formatter={jpyFormatter}
              color={pnl && pnl >= 0 ? 'primary' : 'error'}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  formatter,
  color,
}: {
  label: string
  value?: number
  formatter?: Intl.NumberFormat
  color?: 'primary' | 'error'
}) {
  const display = value !== undefined ? formatter?.format(value) ?? value.toFixed(2) : '--'
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" color={color ?? 'text.primary'}>
        {display}
      </Typography>
    </Box>
  )
}

export default PositionForm
