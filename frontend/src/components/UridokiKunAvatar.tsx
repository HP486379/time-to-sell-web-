import React from 'react'
import type { Decision } from '../domain/decision'

interface Props {
  decision: Decision
  size?: number
  animated?: boolean
  label?: string
  spriteUrl?: string
}

const positionMap: Record<Decision, string> = {
  TAKE_PROFIT: '0% 0%',
  WAIT: '0% 100%',
  HOLD_OR_BUY: '100% 100%',
}

const levelLabels: Record<Decision, string> = {
  TAKE_PROFIT: '利確モード',
  WAIT: '様子見モード',
  HOLD_OR_BUY: '保有・買い増し寄り',
}

export const UridokiKunAvatar: React.FC<Props> = ({
  decision,
  size = 96,
  animated = false,
  label,
  spriteUrl,
  }) => {
    const ariaLabel = label ?? levelLabels[decision]
    const fallback = 'linear-gradient(135deg, #1e293b, #0ea5e9)'
    const envSprite = (import.meta.env.VITE_URIDOKI_SPRITE as string | undefined) ?? undefined
    const defaultSprite = '/assets/uridoki-kun-sprite.png'
    const resolvedUrl = spriteUrl ?? envSprite ?? defaultSprite
  return (
    <div
      className={`uridoki-kun-avatar uridoki-kun-${decision}`}
      style={{
        width: size,
        height: size,
        backgroundImage: resolvedUrl ? `url(${resolvedUrl})` : fallback,
        backgroundSize: resolvedUrl ? '200% 200%' : 'cover',
        backgroundPosition: resolvedUrl ? positionMap[decision] : 'center',
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
