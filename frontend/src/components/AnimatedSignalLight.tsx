import { alpha, Box } from '@mui/material'
import { keyframes, styled } from '@mui/material/styles'

export type SignalLevel = 'buy' | 'hold' | 'sell'

interface AnimatedSignalLightProps {
  level: SignalLevel
}

const pulse = keyframes`
  0% {
    opacity: 0.4;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.15);
  }
  100% {
    opacity: 0.4;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
`

const SignalBody = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '6px 10px',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
}))

interface LightProps {
  bg: string
  active?: boolean
}

const Light = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bg' && prop !== 'active',
})<LightProps>(({ bg, active, theme }) => ({
  width: 36,
  height: 36,
  borderRadius: 9999,
  opacity: active ? 1 : 0.68,
  background: bg,
  boxShadow: [
    `inset 0 0 0 2px ${alpha('#ffffff', theme.palette.mode === 'dark' ? 0.16 : 0.25)}`,
    theme.palette.mode === 'dark'
      ? '0 6px 12px rgba(0, 0, 0, 0.45)'
      : '0 6px 14px rgba(0, 0, 0, 0.18)',
    theme.palette.mode === 'dark'
      ? '0 0 0 1px rgba(255, 255, 255, 0.06)'
      : '0 0 0 1px rgba(0, 0, 0, 0.08)',
  ].join(', '),
  animation: active ? `${pulse} 1.2s ease-in-out infinite` : 'none',
}))

function getLabel(level: SignalLevel) {
  if (level === 'sell') return '売りシグナル'
  if (level === 'buy') return '買いシグナル'
  return 'ホールドシグナル'
}

export const AnimatedSignalLight = ({ level }: AnimatedSignalLightProps) => (
  <Box aria-label={getLabel(level)} sx={{ flexShrink: 0 }}>
    <SignalBody>
      <Light bg="#ff5f56" active={level === 'sell'} className="light light-red" />
      <Light bg="#ffcf4a" active={level === 'hold'} className="light light-yellow" />
      <Light bg="#2ecc71" active={level === 'buy'} className="light light-green" />
    </SignalBody>
  </Box>
)

