import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/dashboard/KPICard';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut';
import { ExpenseDynamics } from '@/components/dashboard/ExpenseDynamics';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { Info, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { parseISO, isBefore, isAfter, subDays, differenceInDays } from 'date-fns';

const Dashboard: React.FC = () => {
  const { kpis, cashFlowSeries, cashGapDate, expenseStructure, incomeStructure, calculatedAccounts, loading, transactions, dateRange } = useData();
  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');
  const [liabilityType, setLiabilityType] = useState<'creditor' | 'debtor'>('creditor');

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const totalCash = calculatedAccounts.reduce((s, a) => s + a.balance, 0);
  const pendingExpenses = transactions.filter(t => t.status === 'PENDING' && t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const pendingIncomes = transactions.filter(t => t.status === 'PENDING' && t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);

  // Rentability calculation
  const { from, to } = dateRange;
  const periodDays = differenceInDays(to, from) || 1;
  const prevFrom = subDays(from, periodDays);
  const prevTo = subDays(to, periodDays);

  const currentIncome = transactions.filter(t => {
    const td = parseISO(t.date);
    return t.status === 'APPROVED' && t.type === 'INCOME' && !isBefore(td, from) && !isAfter(td, to);
  }).reduce((s, t) => s + Number(t.amount), 0);

  const currentExpense = transactions.filter(t => {
    const td = parseISO(t.date);
    return t.status === 'APPROVED' && t.type === 'EXPENSE' && !isBefore(td, from) && !isAfter(td, to);
  }).reduce((s, t) => s + Number(t.amount), 0);

  const prevIncome = transactions.filter(t => {
    const td = parseISO(t.date);
    return t.status === 'APPROVED' && t.type === 'INCOME' && !isBefore(td, prevFrom) && !isAfter(td, prevTo);
  }).reduce((s, t) => s + Number(t.amount), 0);

  const prevExpense = transactions.filter(t => {
    const td = parseISO(t.date);
    return t.status === 'APPROVED' && t.type === 'EXPENSE' && !isBefore(td, prevFrom) && !isAfter(td, prevTo);
  }).reduce((s, t) => s + Number(t.amount), 0);

  const rentability = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome * 100) : 0;
  const prevRentability = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome * 100) : 0;
  const rentDelta = prevRentability === 0 ? (rentability > 0 ? 100 : 0) : Math.round(((rentability - prevRentability) / Math.abs(prevRentability)) * 100);

  // Rentability sparkline
  const rentSparkline = [];
  for (let i = 6; i >= 0; i--) {
    const segEnd = subDays(to, i * Math.floor(periodDays / 7));
    const segStart = subDays(segEnd, Math.floor(periodDays / 7));
    const segInc = transactions.filter(t => {
      const td = parseISO(t.date);
      return t.status === 'APPROVED' && t.type === 'INCOME' && !isBefore(td, segStart) && !isAfter(td, segEnd);
    }).reduce((s, t) => s + Number(t.amount), 0);
    const segExp = transactions.filter(t => {
      const td = parseISO(t.date);
      return t.status === 'APPROVED' && t.type === 'EXPENSE' && !isBefore(td, segStart) && !isAfter(td, segEnd);
    }).reduce((s, t) => s + Number(t.amount), 0);
    rentSparkline.push(segInc > 0 ? ((segInc - segExp) / segInc * 100) : 0);
  }
  const rentSparkData = rentSparkline.map((v, i) => ({ v, name: `P${i}` }));

  return (
    <div className="p-6 space-y-4">
      <FilterBar />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KPICard key={kpi.label} data={kpi} accounts={kpi.label === 'Business Cash' ? calculatedAccounts : undefined} />
        ))}
      </div>

      {/* Cash Flow + Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="rounded-3xl">
          <CardContent className="pt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Money on Accounts</h3>
            <p className="text-xs text-muted-foreground mb-4">Actual balance and cash gap forecast</p>
            <CashFlowChart data={cashFlowSeries} gapDate={cashGapDate} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Rentability Widget */}
          <Card className="rounded-3xl">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rentability</h3>
                <div className={cn('flex items-center gap-0.5 text-xs font-medium', rentDelta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  <TrendingUp className="h-3 w-3" />
                  {Math.abs(rentDelta)}%
                </div>
              </div>
              <p className={cn("text-2xl font-semibold", rentability < 0 && "text-destructive")}>{rentability.toFixed(1)}%</p>
              <div className="h-10 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rentSparkData}>
                    <defs>
                      <linearGradient id="rent-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={rentability < 0 ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={rentability < 0 ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={rentability < 0 ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))'} fill="url(#rent-grad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Creditor / Debtor */}
          <Card className="rounded-3xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1 mb-1">
                <button
                  onClick={() => setLiabilityType(liabilityType === 'creditor' ? 'debtor' : 'creditor')}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors cursor-pointer"
                >
                  {liabilityType === 'creditor' ? 'Creditor Liability' : 'Debtor Liability'}
                </button>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">
                ${(liabilityType === 'creditor' ? pendingExpenses : pendingIncomes).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {liabilityType === 'creditor' ? 'Unpaid expenses' : 'Unpaid invoices'}
              </p>
              {totalCash > 0 && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((liabilityType === 'creditor' ? pendingExpenses : pendingIncomes) / totalCash) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {((((liabilityType === 'creditor' ? pendingExpenses : pendingIncomes) / totalCash) * 100)).toFixed(1)}% of total balance
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Dynamics + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="rounded-3xl">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBreakdownType(breakdownType === 'expense' ? 'income' : 'expense')}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors cursor-pointer"
                >
                  {breakdownType === 'expense' ? 'Expense' : 'Income'} Dynamics
                </button>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <ExpenseDynamics type={breakdownType} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setBreakdownType(breakdownType === 'expense' ? 'income' : 'expense')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors cursor-pointer"
              >
                {breakdownType === 'expense' ? 'Expense' : 'Income'} Structure
              </button>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
            <ExpenseDonut data={breakdownType === 'expense' ? expenseStructure : incomeStructure} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
