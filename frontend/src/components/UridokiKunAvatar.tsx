import React from 'react'
import type { Decision } from '../domain/decision'
import { DEFAULT_AVATAR_ALT, DEFAULT_AVATAR_SPRITE } from '../constants/maAvatarMap'

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
  const padding = Math.max(10, Math.round(size * 0.05))
  const ariaLabel = label ?? DEFAULT_AVATAR_ALT ?? levelLabels[decision]
  const fallback = 'linear-gradient(135deg, #1e293b, #0ea5e9)'
  const resolvedUrl = spriteUrl ?? DEFAULT_AVATAR_SPRITE

  return (
    <div
      className={`uridoki-kun-avatar uridoki-kun-${decision}`}
      style={{
        width: size,
        height: size,
        padding,
        boxSizing: 'border-box',
        backgroundImage: resolvedUrl ? `url(${resolvedUrl})` : fallback,
        backgroundSize: resolvedUrl ? '200% 200%' : 'cover',
        backgroundPosition: resolvedUrl ? positionMap[decision] : 'center',
        backgroundRepeat: 'no-repeat',
        backgroundOrigin: 'padding-box',
        borderRadius: 16,
        boxShadow: animated ? '0 10px 25px rgba(0,0,0,0.12)' : undefined,
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  )
}

export default UridokiKunAvatar
