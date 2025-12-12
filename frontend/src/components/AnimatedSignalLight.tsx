import { Box } from '@mui/material'
import { keyframes, styled } from '@mui/material/styles'

export type SignalLevel = 'buy' | 'hold' | 'sell'
type ThemeMode = 'light' | 'dark'

interface AnimatedSignalLightProps {
  level: SignalLevel
  themeMode?: ThemeMode
}

const pulse = keyframes`
  0% {
    opacity: 0.4;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.22);
  }
  100% {
    opacity: 0.4;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
`

interface SignalBodyProps {
  themeMode?: ThemeMode
}

const SignalBody = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'themeMode',
})<SignalBodyProps>(({ themeMode }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 9999,
  background: themeMode === 'dark' ? '#3a3f49' : '#ffe5d5',
  width: '100%',
  justifyContent: 'center',
}))

interface LightProps {
  bg: string
  active?: boolean
  themeMode?: ThemeMode
}

const Light = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bg' && prop !== 'active' && prop !== 'themeMode',
})<LightProps>(({ bg, active, themeMode }) => ({
  width: 28,
  height: 28,
  borderRadius: 9999,
  opacity: active ? 1 : themeMode === 'dark' ? 0.35 : 0.4,
  boxShadow: active ? '0 0 12px rgba(255, 255, 255, 0.22)' : '0 0 0 rgba(0, 0, 0, 0)',
  background: bg,
  animation: active ? `${pulse} 1.4s ease-in-out infinite` : 'none',
}))

function getLabel(level: SignalLevel) {
  if (level === 'sell') return '売りシグナル'
  if (level === 'buy') return '買いシグナル'
  return 'ホールドシグナル'
}

export const AnimatedSignalLight = ({ level, themeMode = 'light' }: AnimatedSignalLightProps) => (
  <Box aria-label={getLabel(level)} sx={{ flexShrink: 0, width: 96 }}>
    <SignalBody themeMode={themeMode} className={`signal-body ${themeMode === 'dark' ? 'signal-body-dark' : ''}`}>
      <Light
        bg={themeMode === 'dark' ? '#ff5c5c' : '#ff6b6b'}
        active={level === 'sell'}
        themeMode={themeMode}
        className="light light-red"
      />
      <Light
        bg={themeMode === 'dark' ? '#f3d96b' : '#ffd166'}
        active={level === 'hold'}
        themeMode={themeMode}
        className="light light-yellow"
      />
      <Light
        bg={themeMode === 'dark' ? '#4bd48a' : '#52d08a'}
        active={level === 'buy'}
        themeMode={themeMode}
        className="light light-green"
      />
    </SignalBody>
  </Box>
)

