export interface EvaluateRequest {
  total_quantity: number
  avg_cost: number
}

export interface EconomicEvent {
  name: string
  importance: number
  date: string
}

export interface EvaluateResponse {
  current_price: number
  market_value: number
  unrealized_pnl: number
  scores: {
    technical: number
    macro: number
    event_adjustment: number
    total: number
    label: string
  }
  technical_details: {
    d: number
    T_base: number
    T_trend: number
  }
  macro_details: {
    p_r: number
    p_cpi: number
    p_vix: number
    M: number
  }
  event_details: {
    E_adj: number
    R_max: number
    effective_event: EconomicEvent | null
  }
}
