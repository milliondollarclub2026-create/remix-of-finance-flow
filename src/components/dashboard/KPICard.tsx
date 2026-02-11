import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { KPIData } from '@/types';
import { DbAccount } from '@/contexts/DataContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface Props {
  data: KPIData;
  accounts?: DbAccount[];
}

export const KPICard: React.FC<Props> = ({ data, accounts }) => {
  const isPositive = data.delta >= 0;
  const isNegativeValue = data.value < 0;
  const sparkData = data.sparkline.map((v, i) => ({ v, name: `Period ${i + 1}` }));

  // Check if any sparkline point is negative
  const hasNegative = data.sparkline.some(v => v < 0);
  const sparkColor = hasNegative ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))';

  const formatValue = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${Math.round(val).toLocaleString()}`;
    return `$${val.toFixed(0)}`;
  };

  // Unique gradient ID per card
  const gradId = `spark-${data.label.replace(/\s+/g, '-')}`;

  return (
    <Card className="rounded-3xl">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{data.label}</p>
          {data.label !== 'Business Cash' && (
            <div className={cn('flex items-center gap-0.5 text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(data.delta)}%
            </div>
          )}
        </div>
        <p className={cn('text-xl font-semibold mb-2', isNegativeValue && 'text-rose-600')}>{formatValue(data.value)}</p>

        {accounts && accounts.length > 0 ? (
          <div className="space-y-0.5 max-h-16 overflow-y-auto">
            {accounts.map(a => (
              <p key={a.id} className="text-xs text-muted-foreground">
                {formatValue(a.balance)} on {a.name}
              </p>
            ))}
          </div>
        ) : (
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card border border-border rounded-lg px-2 py-1 shadow-lg text-xs">
                        <span className="font-semibold">{formatValue(payload[0].value as number)}</span>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  fill={`url(#${gradId})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
