export interface BacktestRequest {
  start_date: string // "YYYY-MM-DD"
  end_date: string // "YYYY-MM-DD"
  initial_cash: number
  sell_threshold: number
  buy_threshold: number
}

export interface BacktestResult {
  final_value: number
  buy_and_hold_final: number
  total_return_pct: number
  max_drawdown: number
  trade_count: number
}
