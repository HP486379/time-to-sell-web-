import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

const data = Array.from({ length: 30 }).map((_, idx) => {
  const base = 4300 + idx * 10
  return {
    date: `Day ${idx + 1}`,
    close: base + Math.sin(idx / 3) * 30,
    ma20: 4300 + idx * 9,
    ma60: 4200 + idx * 6,
    ma200: 4000 + idx * 4,
  }
})

function PriceChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="date" hide />
        <YAxis domain={[4000, 'dataMax + 50']} tick={{ fill: '#9ca3af' }} />
        <Tooltip contentStyle={{ background: '#0b1224', border: '1px solid #334155' }} />
        <Legend />
        <Line type="monotone" dataKey="close" stroke="#7dd3fc" strokeWidth={2} dot={false} name="Close" />
        <Line type="monotone" dataKey="ma20" stroke="#a78bfa" strokeWidth={2} dot={false} name="MA20" />
        <Line type="monotone" dataKey="ma60" stroke="#34d399" strokeWidth={2} dot={false} name="MA60" />
        <Line type="monotone" dataKey="ma200" stroke="#f59e0b" strokeWidth={2} dot={false} name="MA200" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
