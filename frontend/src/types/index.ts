export type IndexType = 'SP500' | 'TOPIX' | 'NIKKEI' | 'NIFTY50'

export const INDEX_LABELS: Record<IndexType, string> = {
  SP500: 'S&P500',
  TOPIX: 'TOPIX',
  NIKKEI: '日経225',
  NIFTY50: 'NIFTY50（インド）',
}

export const PRICE_TITLE_MAP: Record<IndexType, string> = {
  SP500: 'S&P500 価格トレンド',
  TOPIX: 'TOPIX 価格トレンド',
  NIKKEI: '日経225 価格トレンド',
  NIFTY50: 'NIFTY50（インド株）価格トレンド',
}
