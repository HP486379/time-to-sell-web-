export type AlertLevel = 'strong-sell' | 'sell' | 'hold' | 'buy'
export type SignalLevel = 'buy' | 'hold' | 'sell'

export interface AlertState {
  level: AlertLevel
  signalLevel: SignalLevel
  title: string
  message: string
  reaction: string
  color: string
  icon: string
  face: string
}

const ALERT_THRESHOLDS = {
  STRONG_SELL: 80,
  SELL: 60,
  HOLD: 40,
}

const ALERT_DEFINITIONS: Record<AlertLevel, Omit<AlertState, 'level' | 'signalLevel'>> = {
  'strong-sell': {
    title: '利確してOKな水準です',
    message: '株価は長期平均より大きく上振れています。利益確定を積極的に検討できるゾーンです。',
    color: '#E4F6E8',
    icon: '🟢',
    face: '😄',
    reaction: 'いまが利確チャンス。どこで収穫するか作戦会議しましょう。',
  },
  sell: {
    title: '利益確定を検討できそうです',
    message: '株価は平均よりやや高め。部分的な利確やポジション整理を考えられるゾーンです。',
    color: '#F0F5E3',
    icon: '🟢',
    face: '🙂',
    reaction: '好調モード。少しだけ利益を確保しておくのも手です。',
  },
  hold: {
    title: '今は様子見で大丈夫です',
    message: '株価と環境は平均的。慌てず動向を見守るフェーズです。',
    color: '#FFF7E0',
    icon: '🟡',
    face: '( ˘ω˘ )',
    reaction: '穏やかなレンジ。タイミングを待ちましょう。',
  },
  buy: {
    title: 'まだ売らずに保有寄りです',
    message: '株価は割安寄り。中長期ではホールドや買い増しで育てる局面です。',
    color: '#F7E6E6',
    icon: '🔴',
    face: '😌',
    reaction: '熟成中のゾーン。じっくり寝かせて育てましょう。',
  },
}

const SIGNAL_MAP: Record<AlertLevel, SignalLevel> = {
  'strong-sell': 'sell',
  sell: 'sell',
  hold: 'hold',
  buy: 'buy',
}

export function getAlertLevel(score?: number): AlertLevel {
  if (score === undefined) return 'hold'
  if (score >= ALERT_THRESHOLDS.STRONG_SELL) return 'strong-sell'
  if (score >= ALERT_THRESHOLDS.SELL) return 'sell'
  if (score >= ALERT_THRESHOLDS.HOLD) return 'hold'
  return 'buy'
}

export function getAlertState(score?: number): AlertState {
  const level = getAlertLevel(score)
  return {
    level,
    signalLevel: SIGNAL_MAP[level],
    ...ALERT_DEFINITIONS[level],
  }
}

export function getScoreZoneText(score?: number) {
  if (score === undefined) return 'スコアの計算中です。'
  if (score >= 80) return '現在のスコアは「かなり高い水準」です。'
  if (score >= 60) return '現在のスコアは「やや高めの水準」です。'
  if (score >= 40) return '現在のスコアは「平均的な水準」です。'
  if (score >= 20) return '現在のスコアは「やや低めの水準」です。'
  return '現在のスコアは「かなり低い水準」です。'
}
