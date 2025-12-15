export type ScoreMaDays = 20 | 60 | 200

export const DEFAULT_AVATAR_SPRITE = '/assets/uridoki-kun-sprite.png'
export const DEFAULT_AVATAR_ALT = '売り時くん（標準スプライト）'

// MA切り替え時もスプライトを固定するため、すべて同じ画像を参照する
export const maAvatarMap: Record<ScoreMaDays, string> = {
  20: DEFAULT_AVATAR_SPRITE,
  60: DEFAULT_AVATAR_SPRITE,
  200: DEFAULT_AVATAR_SPRITE,
}

export const maAvatarAltLabel: Record<ScoreMaDays, string> = {
  20: DEFAULT_AVATAR_ALT,
  60: DEFAULT_AVATAR_ALT,
  200: DEFAULT_AVATAR_ALT,
}
