import React, { useState } from 'react'
import { Card, CardContent, CardHeader, Button, Typography, Stack } from '@mui/material'
import { runBacktest } from '../apis'
import type { BacktestResult } from '../types/apis'

const DEFAULT_REQUEST = {
  start_date: '2014-01-01',
  end_date: '2024-11-30',
  initial_cash: 1_000_000,
  sell_threshold: 80,
  buy_threshold: 40,
}

const currencyFmt = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const pctFmt = (v: number) => `${v.toFixed(2)} %`

export const BacktestSummaryCard: React.FC = () => {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await runBacktest(DEFAULT_REQUEST)
      setResult(res)
    } catch (e: any) {
      console.error(e)
      setError(e.message ?? 'バックテストに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="バックテスト成績"
        subheader="期間: 2014-01-01 〜 2024-11-30 / 初期資金: ¥1,000,000"
        action={
          <Button variant="contained" size="small" onClick={handleRun} disabled={loading}>
            {loading ? '計算中...' : 'バックテスト実行'}
          </Button>
        }
      />
      <CardContent>
        {error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {result ? (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              最終資産: <strong>{currencyFmt.format(result.final_value)}</strong>
            </Typography>
            <Typography variant="body2">
              単純ホールド: <strong>{currencyFmt.format(result.buy_and_hold_final)}</strong>
            </Typography>
            <Typography variant="body2">
              トータルリターン: <strong>{pctFmt(result.total_return_pct)}</strong>
            </Typography>
            <Typography variant="body2">
              最大ドローダウン: <strong>{pctFmt(result.max_drawdown)}</strong>
            </Typography>
            <Typography variant="body2">
              売買回数: <strong>{result.trade_count} 回</strong>
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            「バックテスト実行」を押すと、この売り時ルールで過去10年の成績を表示します。
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default BacktestSummaryCard
