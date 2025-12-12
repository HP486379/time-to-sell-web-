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
  gap: 10,
  padding: '10px 14px',
  minWidth: 96,
  justifyContent: 'center',
  borderRadius: 9999,
  background: theme.palette.mode === 'dark' ? '#1f2633' : '#ffefe3',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255,255,255,0.08)'
      : '1px solid rgba(0,0,0,0.06)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 20px rgba(0, 0, 0, 0.35)'
      : '0 6px 16px rgba(0, 0, 0, 0.08)',
}))

interface LightProps {
  bg: string
  active?: boolean
}

const Light = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bg' && prop !== 'active',
})<LightProps>(({ bg, active }) => ({
  width: 28,
  height: 28,
  borderRadius: 9999,
  opacity: active ? 1 : 0.6,
  boxShadow: `inset 0 0 0 2px ${alpha('#ffffff', 0.14)}`,
  background: bg,
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

