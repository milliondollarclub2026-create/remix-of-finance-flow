import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Download, Building2, Landmark } from 'lucide-react';
import { parseISO, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

const Analytics: React.FC = () => {
  const {
    transactions, categories, accounts, counterparties,
    calculatedAccounts, dateRange, loading,
  } = useData();

  const { from, to } = dateRange;

  const rangeTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.status !== 'APPROVED') return false;
      const td = parseISO(t.date);
      return !isBefore(td, from) && !isAfter(td, to);
    });
  }, [transactions, from, to]);

  const totalIncome = useMemo(() => rangeTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0), [rangeTransactions]);
  const totalExpense = useMemo(() => rangeTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0), [rangeTransactions]);
  const netProfit = totalIncome - totalExpense;
  const netMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;

  const pnlData = useMemo(() => {
    const revenueByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    for (const t of rangeTransactions) {
      const cat = categories.find(c => c.id === t.category_id);
      const name = cat?.name || 'Other';
      if (t.type === 'INCOME') revenueByCategory[name] = (revenueByCategory[name] || 0) + Number(t.amount);
      else if (t.type === 'EXPENSE') expenseByCategory[name] = (expenseByCategory[name] || 0) + Number(t.amount);
    }
    return {
      revenue: Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1]),
      expenses: Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]),
    };
  }, [rangeTransactions, categories]);

  const cashFlowData = useMemo(() => {
    const operating: Record<string, number> = {};
    const transfers: { from: string; to: string; amount: number }[] = [];
    for (const t of rangeTransactions) {
      if (t.type === 'TRANSFER') {
        transfers.push({ from: accounts.find(a => a.id === t.account_id)?.name || '?', to: accounts.find(a => a.id === t.to_account_id)?.name || '?', amount: Number(t.amount) });
      } else {
        const name = categories.find(c => c.id === t.category_id)?.name || 'Other';
        operating[name] = (operating[name] || 0) + Number(t.amount) * (t.type === 'INCOME' ? 1 : -1);
      }
    }
    const operatingEntries = Object.entries(operating).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const operatingTotal = operatingEntries.reduce((s, [, v]) => s + v, 0);
    return { operatingEntries, operatingTotal, transfers, netCashFlow: operatingTotal };
  }, [rangeTransactions, categories, accounts]);

  const balanceSheet = useMemo(() => {
    const cashAccounts = calculatedAccounts.filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance);
    const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0);
    const cpBalances = counterparties.map(cp => {
      const cpTxns = transactions.filter(t => t.counterparty_id === cp.id && t.status === 'APPROVED');
      const inc = cpTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const exp = cpTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      return { ...cp, balance: inc - exp };
    });
    const receivables = cpBalances.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
    const totalReceivables = receivables.reduce((s, c) => s + c.balance, 0);
    const payables = cpBalances.filter(c => c.balance < 0).sort((a, b) => a.balance - b.balance);
    const totalPayables = Math.abs(payables.reduce((s, c) => s + c.balance, 0));
    const totalAssets = totalCash + totalReceivables;
    const equity = totalAssets - totalPayables;
    return { cashAccounts, totalCash, receivables, totalReceivables, payables, totalPayables, totalAssets, equity };
  }, [calculatedAccounts, counterparties, transactions]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const fmt = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const SummaryCards = () => (
    <div className="space-y-4">
      <Card className="rounded-3xl">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Income</span>
          </div>
          <p className="text-2xl font-bold mt-2">{fmt(totalIncome)}</p>
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full w-full" /></div>
        </CardContent>
      </Card>
      <Card className="rounded-3xl">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center"><TrendingDown className="h-4 w-4 text-rose-600" /></div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Expense</span>
          </div>
          <p className="text-2xl font-bold mt-2">{fmt(totalExpense)}</p>
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: totalIncome > 0 ? `${Math.min(100, (totalExpense / totalIncome) * 100)}%` : '0%' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-right">{totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}% of Revenue` : '—'}</p>
        </CardContent>
      </Card>
      <Card className="rounded-3xl bg-primary text-primary-foreground">
        <CardContent className="pt-5 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Profitability</span>
          <p className="text-3xl font-bold mt-1">{netMargin.toFixed(1)}%</p>
          <p className="text-xs opacity-70 mt-1">Target: 25.0%</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">Detailed analysis of your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar />
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList className="bg-foreground p-1 rounded-xl gap-0.5">
          <TabsTrigger value="pnl" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-background/70 rounded-lg px-5">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cashflow" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-background/70 rounded-lg px-5">Cash Flow</TabsTrigger>
          <TabsTrigger value="balance" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-background/70 rounded-lg px-5">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
            <Card className="rounded-3xl">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold">Income Statement</h3>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> Cash Basis</span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Revenue</span>
                    <span className="text-lg font-bold">{fmt(totalIncome)}</span>
                  </div>
                  <div className="space-y-2.5 ml-2">
                    {pnlData.revenue.map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{totalIncome > 0 ? ((value / totalIncome) * 100).toFixed(1) : 0}%</span>
                          <span className="text-sm font-medium tabular-nums">{fmt(value)}</span>
                        </div>
                      </div>
                    ))}
                    {pnlData.revenue.length === 0 && <p className="text-sm text-muted-foreground italic">No income recorded</p>}
                  </div>
                </div>
                <div className="border-t border-border my-4" />
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Operating Expenses</span>
                    <span className="text-lg font-bold">{fmt(totalExpense)}</span>
                  </div>
                  <div className="space-y-2.5 ml-2">
                    {pnlData.expenses.map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{totalIncome > 0 ? ((value / totalIncome) * 100).toFixed(1) : 0}%</span>
                          <span className="text-sm font-medium tabular-nums">{fmt(value)}</span>
                        </div>
                      </div>
                    ))}
                    {pnlData.expenses.length === 0 && <p className="text-sm text-muted-foreground italic">No expenses recorded</p>}
                  </div>
                </div>
                <div className="border-t border-border my-4" />
                <Card className="rounded-2xl bg-muted/50">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div><p className="text-base font-bold">Net Profit</p><p className="text-xs text-muted-foreground">Net Margin</p></div>
                      <div className="text-right">
                        <p className={cn('text-xl font-bold tabular-nums', netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{netProfit < 0 ? '-' : ''}{fmt(netProfit)}</p>
                        <p className={cn('text-xs', netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{netMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            <SummaryCards />
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
            <Card className="rounded-3xl">
              <CardContent className="pt-6 pb-6">
                <h3 className="text-base font-semibold mb-6">Cash Flow Statement</h3>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Operating Activities</span>
                    <span className={cn('text-lg font-bold', cashFlowData.operatingTotal >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {cashFlowData.operatingTotal < 0 ? '-' : ''}{fmt(cashFlowData.operatingTotal)}
                    </span>
                  </div>
                  <div className="space-y-2.5 ml-2">
                    {cashFlowData.operatingEntries.map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <span className={cn('text-sm font-medium tabular-nums', value >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                          {value < 0 ? '-' : '+'}{fmt(value)}
                        </span>
                      </div>
                    ))}
                    {cashFlowData.operatingEntries.length === 0 && <p className="text-sm text-muted-foreground italic">No operating activities</p>}
                  </div>
                </div>
                {cashFlowData.transfers.length > 0 && (
                  <>
                    <div className="border-t border-border my-4" />
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Transfers</span>
                        <span className="text-lg font-bold text-muted-foreground">$0</span>
                      </div>
                      <div className="space-y-2.5 ml-2">
                        {cashFlowData.transfers.map((t, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t.from} → {t.to}</span>
                            <span className="text-sm font-medium tabular-nums text-muted-foreground">{fmt(t.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="border-t border-border my-4" />
                <Card className="rounded-2xl bg-muted/50">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold">Net Cash Flow</p>
                      <p className={cn('text-xl font-bold tabular-nums', cashFlowData.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {cashFlowData.netCashFlow < 0 ? '-' : ''}{fmt(cashFlowData.netCashFlow)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            <SummaryCards />
          </div>
        </TabsContent>

        <TabsContent value="balance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card className="rounded-3xl">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /><h3 className="text-base font-semibold">Assets</h3></div>
                  <span className="text-xl font-bold">{fmt(balanceSheet.totalAssets)}</span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-emerald-600" /><span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Cash & Equivalents</span></div>
                    <span className="text-base font-bold">{fmt(balanceSheet.totalCash)}</span>
                  </div>
                  <div className="space-y-2 ml-2">
                    {balanceSheet.cashAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between border-l-2 border-emerald-200 pl-3">
                        <span className="text-sm">{acc.name}</span>
                        <span className="text-sm font-medium tabular-nums">{fmt(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" /><span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Accounts Receivable</span></div>
                    <span className="text-base font-bold">{fmt(balanceSheet.totalReceivables)}</span>
                  </div>
                  <div className="space-y-2 ml-2">
                    {balanceSheet.receivables.map(cp => (
                      <div key={cp.id} className="flex items-center justify-between border-l-2 border-emerald-200 pl-3">
                        <span className="text-sm">{cp.name}</span>
                        <span className="text-sm font-medium tabular-nums">{fmt(cp.balance)}</span>
                      </div>
                    ))}
                    {balanceSheet.receivables.length === 0 && <p className="text-sm text-muted-foreground italic ml-3">No receivables</p>}
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Assets</span>
                  <span className="text-lg font-bold text-emerald-600">{fmt(balanceSheet.totalAssets)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-600" /><h3 className="text-base font-semibold">Liabilities & Equity</h3></div>
                  <span className="text-xl font-bold">{fmt(balanceSheet.totalAssets)}</span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" /><span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Current Liabilities</span></div>
                    <span className="text-base font-bold text-rose-600">{fmt(balanceSheet.totalPayables)}</span>
                  </div>
                  <div className="space-y-2 ml-2">
                    {balanceSheet.payables.map(cp => (
                      <div key={cp.id} className="flex items-center justify-between border-l-2 border-rose-200 pl-3">
                        <span className="text-sm">{cp.name}</span>
                        <span className="text-sm font-medium tabular-nums">{fmt(Math.abs(cp.balance))}</span>
                      </div>
                    ))}
                    {balanceSheet.payables.length === 0 && <p className="text-sm text-muted-foreground italic ml-3">No payables</p>}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equity</span></div>
                    <span className="text-base font-bold">{fmt(balanceSheet.equity)}</span>
                  </div>
                  <div className="space-y-2 ml-2">
                    <div className="flex items-center justify-between border-l-2 border-border pl-3">
                      <span className="text-sm">Retained Earnings</span>
                      <span className="text-sm font-medium tabular-nums">{fmt(balanceSheet.equity)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Liabilities & Equity</span>
                  <span className="text-lg font-bold">{fmt(balanceSheet.totalAssets)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
