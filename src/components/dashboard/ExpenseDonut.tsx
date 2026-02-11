import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { ExpenseStructureSlice } from '@/types';

const PALETTE = [
  'hsl(228, 68%, 55%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)',
  'hsl(330, 81%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 60%)',
];

interface Props {
  data: ExpenseStructureSlice[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-sm font-semibold">
        {(percent * 100).toFixed(1)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {payload.name}
      </text>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3}
      />
    </g>
  );
};

export const ExpenseDonut: React.FC<Props> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((s, d) => s + d.value, 0);

  const formatTotal = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${Math.round(val).toLocaleString()}`;
    return `$${val}`;
  };

  if (data.length === 0) {
    return <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>;
  }

  return (
    <div className="h-56 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-lg font-semibold">${Number(d.value).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{d.percentage}% of total</p>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, idx) => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {activeIndex === undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-semibold">{formatTotal(total)}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
      )}
    </div>
  );
};
