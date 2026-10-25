import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine,
} from 'recharts';

interface ShelfLifeChartProps {
  remainingDays: number;
  lowDays: number;
  highDays: number;
  totalDays: number;
}

export function ShelfLifeChart({ remainingDays, lowDays, highDays, totalDays }: ShelfLifeChartProps) {
  // Build a 2-point dataset showing the uncertainty band over time
  const data = [
    { day: 0, central: totalDays, low: totalDays, high: totalDays },
    { day: totalDays - remainingDays, central: remainingDays, low: lowDays, high: highDays },
    { day: totalDays, central: 0, low: 0, high: 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="slGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 10 }} label={{ value: 'Days in store', position: 'insideBottom', fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)} days`, '']}
          labelFormatter={l => `Day ${l}`}
        />
        <Area
          type="monotone" dataKey="high" stroke="none"
          fill="#bfdbfe" fillOpacity={0.5} name="Optimistic"
        />
        <Area
          type="monotone" dataKey="low" stroke="none"
          fill="white" fillOpacity={1} name="Pessimistic (lower bound)"
        />
        <Area
          type="monotone" dataKey="central" stroke="#3b82f6" strokeWidth={2}
          fill="url(#slGrad)" name="Central estimate"
        />
        <ReferenceLine x={totalDays - remainingDays} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Today', fontSize: 10 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
