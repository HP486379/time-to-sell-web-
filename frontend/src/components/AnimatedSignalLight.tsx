import { Box } from '@mui/material'
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

const SignalBody = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 9999,
  background: '#ffe5d5',
}))

interface LightProps {
  bg: string
  active?: boolean
}

const Light = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bg' && prop !== 'active',
})<LightProps>(({ bg, active }) => ({
  width: 20,
  height: 20,
  borderRadius: 9999,
  opacity: 0.4,
  boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
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
      <Light bg="#ff6b6b" active={level === 'sell'} className="light light-red" />
      <Light bg="#ffd166" active={level === 'hold'} className="light light-yellow" />
      <Light bg="#52d08a" active={level === 'buy'} className="light light-green" />
    </SignalBody>
  </Box>
)

