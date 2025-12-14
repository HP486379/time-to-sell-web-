export type ScoreMaDays = 20 | 60 | 200

export const maAvatarMap: Record<ScoreMaDays, string> = {
  20: '/assets/uridoki-kun-sprite_MA20.png',
  60: '/assets/uridoki-kun-sprite_MA60.png',
  200: '/assets/uridoki-kun-sprite_MA200.png',
}

export const maAvatarAltLabel: Record<ScoreMaDays, string> = {
  20: '売り時くん（MA20）',
  60: '売り時くん（MA60）',
  200: '売り時くん（MA200）',
}
