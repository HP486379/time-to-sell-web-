import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { PricePoint } from '../types/api'

type Props = {
  priceSeries: PricePoint[]
}

function PriceChart({ priceSeries }: Props) {
  if (!priceSeries.length) {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={[]}></LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={priceSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          tickFormatter={(d) => (typeof d === 'string' ? d.slice(5) : d)}
          minTickGap={20}
        />
        <YAxis tick={{ fill: '#9ca3af' }} domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ background: '#0b1224', border: '1px solid #334155' }} labelFormatter={(l) => `日付: ${l}`} />
        <Legend />
        <Line type="monotone" dataKey="close" stroke="#7dd3fc" strokeWidth={2} dot={false} name="終値" />
        <Line type="monotone" dataKey="ma20" stroke="#a78bfa" strokeWidth={2} dot={false} name="MA20" />
        <Line type="monotone" dataKey="ma60" stroke="#34d399" strokeWidth={2} dot={false} name="MA60" />
        <Line type="monotone" dataKey="ma200" stroke="#f59e0b" strokeWidth={2} dot={false} name="MA200" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
