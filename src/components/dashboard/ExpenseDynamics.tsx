import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useData } from '@/contexts/DataContext';
import { parseISO, format, startOfMonth } from 'date-fns';

const PALETTE = [
  'hsl(228, 68%, 55%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)',
  'hsl(330, 81%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 60%)',
];

interface Props {
  type: 'expense' | 'income';
}

export const ExpenseDynamics: React.FC<Props> = ({ type }) => {
  const { transactions, categories, dateRange } = useData();

  const chartData = useMemo(() => {
    const txnType = type === 'expense' ? 'EXPENSE' : 'INCOME';
    const txns = transactions.filter(t =>
      t.status === 'APPROVED' && t.type === txnType &&
      t.date >= format(dateRange.from, 'yyyy-MM-dd') && t.date <= format(dateRange.to, 'yyyy-MM-dd')
    );

    const months: Record<string, Record<string, number>> = {};
    for (const t of txns) {
      const monthKey = format(startOfMonth(parseISO(t.date)), 'MMM yy');
      const catName = categories.find(c => c.id === t.category_id)?.name || 'Other';
      if (!months[monthKey]) months[monthKey] = {};
      months[monthKey][catName] = (months[monthKey][catName] || 0) + Number(t.amount);
    }

    return Object.entries(months).map(([month, cats]) => ({ month, ...cats }));
  }, [transactions, categories, dateRange, type]);

  const catNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach(d => Object.keys(d).filter(k => k !== 'month').forEach(k => names.add(k)));
    return Array.from(names);
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
              <span className="text-xs">{p.dataKey}</span>
            </div>
            <span className="text-xs font-semibold">
              ${Number(p.value).toLocaleString()} ({total > 0 ? ((p.value / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        ))}
        <div className="border-t border-border mt-1 pt-1">
          <span className="text-xs font-semibold">Total: ${total.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data for the selected period</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {catNames.map((name, i) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`}
            />
            <YAxis type="category" dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220, 14%, 96%)', opacity: 0.5 }} />
            {catNames.map((name, i) => (
              <Bar key={name} dataKey={name} stackId="a" fill={PALETTE[i % PALETTE.length]} radius={i === catNames.length - 1 ? [0, 4, 4, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
