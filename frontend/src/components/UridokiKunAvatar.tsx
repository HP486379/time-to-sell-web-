import React from 'react'

export type SimpleAlertLevel = 'strong-sell' | 'sell' | 'hold' | 'buy'

interface Props {
  level: SimpleAlertLevel
  size?: number
  animated?: boolean
  label?: string
  spriteUrl?: string
}

const positionMap: Record<SimpleAlertLevel, string> = {
  'strong-sell': '0% 0%',
  sell: '100% 0%',
  hold: '0% 100%',
  buy: '100% 100%',
}

const levelLabels: Record<SimpleAlertLevel, string> = {
  'strong-sell': '強い売り時',
  sell: '売り寄り',
  hold: 'ホールド',
  buy: '買い増し寄り',
}

export const UridokiKunAvatar: React.FC<Props> = ({
  level,
  size = 96,
  animated = false,
  label,
  spriteUrl,
  }) => {
    const ariaLabel = label ?? levelLabels[level]
    const fallback = 'linear-gradient(135deg, #1e293b, #0ea5e9)'
    const envSprite = (import.meta.env.VITE_URIDOKI_SPRITE as string | undefined) ?? undefined
    const defaultSprite = '/assets/uridoki-kun-sprite.png'
    const resolvedUrl = spriteUrl ?? envSprite ?? defaultSprite
  return (
    <div
      className={`uridoki-kun-avatar uridoki-kun-${level}`}
      style={{
        width: size,
        height: size,
        backgroundImage: resolvedUrl ? `url(${resolvedUrl})` : fallback,
        backgroundSize: resolvedUrl ? '200% 200%' : 'cover',
        backgroundPosition: resolvedUrl ? positionMap[level] : 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: 16,
        boxShadow: animated ? '0 10px 25px rgba(0,0,0,0.12)' : undefined,
      }}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  )
}

export default UridokiKunAvatar
