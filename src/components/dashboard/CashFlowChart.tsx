import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CashFlowPoint } from '@/types';
import { format, parseISO } from 'date-fns';

interface Props {
  data: CashFlowPoint[];
  gapDate: string | null;
}

export const CashFlowChart: React.FC<Props> = ({ data, gapDate }) => {
  const sampled = useMemo(() => {
    if (data.length <= 90) return data;
    const step = Math.ceil(data.length / 90);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Calculate the gradient offset so stroke/fill is blue above 0 and red below 0
  const gradientOffset = useMemo(() => {
    const balances = sampled.map(d => d.balance);
    const max = Math.max(...balances, 0);
    const min = Math.min(...balances, 0);
    if (max === min) return 1;
    return max / (max - min);
  }, [sampled]);

  // Find the first date where balance goes negative (debt starting point)
  const firstNegDate = useMemo(() => {
    const pt = sampled.find(p => p.balance < 0);
    return pt?.date ?? null;
  }, [sampled]);

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data for the selected period</div>;
  }

  const blueColor = 'hsl(var(--primary))';
  const redColor = 'hsl(0, 84%, 60%)';

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {/* Stroke gradient: blue above zero, red below */}
            <linearGradient id="strokeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={blueColor} />
              <stop offset={`${gradientOffset * 100}%`} stopColor={blueColor} />
              <stop offset={`${gradientOffset * 100}%`} stopColor={redColor} />
              <stop offset="100%" stopColor={redColor} />
            </linearGradient>
            {/* Fill gradient: blue fade above zero, red fade below */}
            <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={blueColor} stopOpacity={0.2} />
              <stop offset={`${gradientOffset * 100}%`} stopColor={blueColor} stopOpacity={0.02} />
              <stop offset={`${gradientOffset * 100}%`} stopColor={redColor} stopOpacity={0.02} />
              <stop offset="100%" stopColor={redColor} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={v => format(parseISO(v), 'dd.MM')}
            tick={{ fontSize: 10, fill: 'hsl(220, 9%, 46%)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 10, fill: 'hsl(220, 9%, 46%)' }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as CashFlowPoint;
              return (
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                  <p className="text-muted-foreground text-xs">{format(parseISO(p.date), 'dd.MM.yyyy')}</p>
                  <p className={`font-semibold ${p.balance < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(p.balance)}</p>
                  {p.isProjection && <p className="text-xs text-muted-foreground">Forecast</p>}
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke={redColor} strokeDasharray="3 3" strokeOpacity={0.5} />

          <ReferenceLine
            x={todayStr}
            stroke="hsl(220, 9%, 46%)"
            strokeDasharray="4 4"
            label={{ value: 'Today', fill: 'hsl(220, 9%, 46%)', fontSize: 10, position: 'top' }}
          />

          {/* Red star at debt starting point */}
          {firstNegDate && (
            <ReferenceLine
              x={firstNegDate}
              stroke={redColor}
              strokeDasharray="4 4"
              label={{ value: '★ Cash Gap', fill: redColor, fontSize: 11, position: 'top' }}
            />
          )}

          {/* Actual line - gradient stroke turns red below zero */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="url(#strokeGrad)"
            fill="url(#fillGrad)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {/* Forecast line - same gradient coloring */}
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="url(#strokeGrad)"
            fill="url(#fillGrad)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
