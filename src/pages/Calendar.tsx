import React, { useState, useMemo, useCallback } from 'react';
import { useData, DbTransaction, DbPlannedPayment } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, CalendarIcon, Zap, Wallet, TrendingUp, TrendingDown, Settings2 } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, parseISO, isAfter, isBefore, eachDayOfInterval,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

type StatusFilter = 'all' | 'actual' | 'planned';
type TypeFilter = 'all' | 'income' | 'expense';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Calendar: React.FC = () => {
  const {
    transactions, plannedPayments, accounts, categories, projects, counterparties,
    calculatedAccounts, setTransactions, companySettings,
  } = useData();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addType, setAddType] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Calendar display settings
  const [showChart, setShowChart] = useState(true);
  const [showCashGap, setShowCashGap] = useState(true);
  const [showSaldo, setShowSaldo] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  // Form state for adding from day modal
  const [formAmount, setFormAmount] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formCounterpartyId, setFormCounterpartyId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const defaultAccountId = companySettings?.default_account_id || (accounts.length > 0 ? accounts[0].id : '');

  // Calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Filter transactions and planned payments
  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      if (t.status !== 'APPROVED') return false;
      if (filterAccount !== 'all' && t.account_id !== filterAccount) return false;
      if (filterProject !== 'all' && t.project_id !== filterProject) return false;
      if (typeFilter === 'income' && t.type !== 'INCOME') return false;
      if (typeFilter === 'expense' && t.type !== 'EXPENSE') return false;
      return true;
    });
  }, [transactions, filterAccount, filterProject, typeFilter]);

  const filteredPlanned = useMemo(() => {
    return plannedPayments.filter(pp => {
      if (filterAccount !== 'all' && pp.account_id !== filterAccount) return false;
      if (filterProject !== 'all' && pp.project_id !== filterProject) return false;
      if (typeFilter === 'income' && pp.type !== 'INCOME') return false;
      if (typeFilter === 'expense' && pp.type !== 'EXPENSE') return false;
      return true;
    });
  }, [plannedPayments, filterAccount, filterProject, typeFilter]);

  // Build daily data map
  interface DayData {
    date: string;
    startBalance: number;
    endBalance: number;
    incomes: number;
    expenses: number;
    saldo: number;
    transactions: DbTransaction[];
    planned: DbPlannedPayment[];
    hasCashGap: boolean;
  }

  const dailyData = useMemo(() => {
    const map: Record<string, DayData> = {};
    const relevantAccounts = filterAccount === 'all' ? accounts : accounts.filter(a => a.id === filterAccount);
    let runningBalance = relevantAccounts.reduce((s, a) => s + Number(a.opening_balance), 0);

    const calStartStr = format(calendarStart, 'yyyy-MM-dd');
    const sortedTxns = [...filteredTxns].sort((a, b) => a.date.localeCompare(b.date));
    
    for (const t of sortedTxns) {
      if (t.date >= calStartStr) break;
      if (t.type === 'INCOME') runningBalance += Number(t.amount);
      else if (t.type === 'EXPENSE') runningBalance -= Number(t.amount);
      else if (t.type === 'TRANSFER') {
        if (filterAccount === 'all') continue;
        if (t.account_id === filterAccount) runningBalance -= Number(t.amount);
        if (t.to_account_id === filterAccount) runningBalance += Number(t.amount);
      }
    }

    for (const day of calendarDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isProjection = dateStr > todayStr;
      const startBal = runningBalance;

      const dayTxns = sortedTxns.filter(t => t.date === dateStr);
      const dayPlanned = filteredPlanned.filter(pp => pp.date === dateStr);

      let dayIncome = 0;
      let dayExpense = 0;

      if (!isProjection || statusFilter === 'all' || statusFilter === 'actual') {
        for (const t of dayTxns) {
          if (t.type === 'INCOME') { dayIncome += Number(t.amount); runningBalance += Number(t.amount); }
          else if (t.type === 'EXPENSE') { dayExpense += Number(t.amount); runningBalance -= Number(t.amount); }
        }
      }

      if (isProjection || statusFilter === 'all' || statusFilter === 'planned') {
        for (const pp of dayPlanned) {
          if (pp.type === 'INCOME') { dayIncome += Number(pp.amount); if (isProjection) runningBalance += Number(pp.amount); }
          else if (pp.type === 'EXPENSE') { dayExpense += Number(pp.amount); if (isProjection) runningBalance -= Number(pp.amount); }
        }
      }

      map[dateStr] = {
        date: dateStr,
        startBalance: startBal,
        endBalance: runningBalance,
        incomes: dayIncome,
        expenses: dayExpense,
        saldo: dayIncome - dayExpense,
        transactions: statusFilter !== 'planned' ? dayTxns : [],
        planned: statusFilter !== 'actual' ? dayPlanned : [],
        hasCashGap: runningBalance < 0,
      };
    }

    return map;
  }, [calendarDays, filteredTxns, filteredPlanned, accounts, filterAccount, todayStr, statusFilter]);

  // Cash flow chart data
  const chartData = useMemo(() => {
    return calendarDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dd = dailyData[dateStr];
      const isProjection = dateStr > todayStr;
      return {
        date: dateStr,
        day: format(day, 'd'),
        actual: !isProjection ? dd?.endBalance ?? 0 : undefined,
        forecast: isProjection ? dd?.endBalance ?? 0 : undefined,
        balance: dd?.endBalance ?? 0,
        isProjection,
      };
    });
  }, [calendarDays, dailyData, todayStr]);

  const cashGapPoint = useMemo(() => {
    return chartData.find(p => p.isProjection && p.balance < 0);
  }, [chartData]);

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : '';
    const abs = Math.abs(val);
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${sign}$${abs.toFixed(2)}`;
  };

  const formatShort = (val: number) => {
    const sign = val < 0 ? '-' : '';
    const abs = Math.abs(val);
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const selectedDayData = selectedDay ? dailyData[format(selectedDay, 'yyyy-MM-dd')] : null;

  const openAddFromDay = (type: 'INCOME' | 'EXPENSE') => {
    setFormAmount('');
    setFormAccountId(defaultAccountId);
    setFormCategoryId('');
    setFormProjectId('');
    setFormCounterpartyId('');
    setFormDescription('');
    setAddType(type);
  };

  const handleAddSubmit = async () => {
    if (!formAmount || !formAccountId || !selectedDay) return;
    setSaving(true);
    const { data, error } = await supabase.from('transactions').insert({
      amount: parseFloat(formAmount),
      account_id: formAccountId,
      date: format(selectedDay, 'yyyy-MM-dd'),
      type: addType!,
      status: 'APPROVED',
      description: formDescription || '',
      category_id: formCategoryId || null,
      project_id: formProjectId || null,
      counterparty_id: formCounterpartyId || null,
    }).select().single();
    if (!error && data) {
      setTransactions(prev => [data as unknown as DbTransaction, ...prev]);
    }
    setSaving(false);
    setAddType(null);
  };

  const getCategoryName = (id?: string | null) => categories.find(c => c.id === id)?.name || '';
  const getProjectName = (id?: string | null) => projects.find(p => p.id === id)?.name || '';
  const getCounterpartyName = (id?: string | null) => counterparties.find(c => c.id === id)?.name || '';
  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '';

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[160px]">
                <CalendarIcon className="h-4 w-4" />
                {format(currentMonth, 'MMMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={currentMonth} onSelect={d => d && setCurrentMonth(d)} />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <Wallet className="h-3 w-3 mr-1" />
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue placeholder="Planned & Actual" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Planned & Actual</SelectItem>
            <SelectItem value="actual">Actual Only</SelectItem>
            <SelectItem value="planned">Planned Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income Only</SelectItem>
            <SelectItem value="expense">Expense Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Settings button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 ml-auto">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Display Settings</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showChart} onCheckedChange={v => setShowChart(v === true)} />
                <span className="text-sm">Chart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showBalances} onCheckedChange={v => setShowBalances(v === true)} />
                <span className="text-sm">Balances</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showSaldo} onCheckedChange={v => setShowSaldo(v === true)} />
                <span className="text-sm">Saldo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showCashGap} onCheckedChange={v => setShowCashGap(v === true)} />
                <span className="text-sm">Cash Gap</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        {showCashGap && cashGapPoint && (
          <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/5 text-destructive rounded-lg px-3 py-1.5">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Cash Gap {format(parseISO(cashGapPoint.date), 'dd.MM.yyyy')}</span>
          </div>
        )}
      </div>

      {/* Forecast Chart */}
      {showChart && (
        <Card className="rounded-3xl">
          <CardContent className="pt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Money on Accounts</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="calBalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="calNegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 9%, 46%)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatShort} tick={{ fontSize: 10, fill: 'hsl(220, 9%, 46%)' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                          <p className="text-muted-foreground text-xs">{format(parseISO(p.date), 'dd.MM.yyyy')}</p>
                          <p className={cn("font-semibold", p.balance >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(p.balance)}</p>
                          {p.isProjection && <p className="text-xs text-muted-foreground">Forecast</p>}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(0, 84%, 60%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine x={format(today, 'd')} stroke="hsl(220, 9%, 46%)" strokeDasharray="4 4"
                    label={{ value: 'Today', fill: 'hsl(220, 9%, 46%)', fontSize: 10, position: 'top' }} />
                  {showCashGap && cashGapPoint && (
                    <ReferenceLine x={format(parseISO(cashGapPoint.date), 'd')} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4"
                      label={{ value: '⚠ Cash Gap', fill: 'hsl(0, 84%, 60%)', fontSize: 10, position: 'top' }} />
                  )}
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" fill="url(#calBalGrad)" strokeWidth={2} dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" fill="url(#calBalGrad)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <div className="border border-border rounded-3xl overflow-hidden bg-card overflow-x-auto">
        <div className="min-w-[768px]">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(day => (
            <div key={day} className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dd = dailyData[dateStr];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const hasActivity = dd && (dd.incomes > 0 || dd.expenses > 0);
            const isNegative = dd && dd.endBalance < 0;
            const isPositiveSaldo = dd && dd.saldo > 0;

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'min-h-[120px] border-b border-r border-border/50 px-2 py-1.5 cursor-pointer transition-colors hover:bg-primary/[0.03]',
                  !isCurrentMonth && 'bg-muted/30',
                  !hasActivity && isCurrentMonth && 'opacity-70',
                  isNegative && isCurrentMonth && 'bg-destructive/[0.04]',
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-end mb-1">
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-primary-foreground',
                    !isCurrentMonth && 'text-muted-foreground/50',
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Day content */}
                {dd && hasActivity && isCurrentMonth && (
                  <div className="space-y-0.5 text-[11px] tabular-nums">
                    {showBalances && (
                      <p className="text-muted-foreground">{formatCurrency(dd.startBalance)}</p>
                    )}
                    {dd.incomes > 0 && (
                      <p className="text-emerald-600 font-medium">+ ${dd.incomes.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    )}
                    {dd.expenses > 0 && (
                      <p className="text-destructive font-medium">– ${dd.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    )}
                    {/* Saldo badge */}
                    {showSaldo && (
                      <div className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold',
                        dd.saldo >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-destructive/10 text-destructive',
                      )}>
                        {dd.saldo >= 0 ? '+' : ''}${dd.saldo.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {showBalances && (
                      <p className={cn('text-muted-foreground', dd.endBalance < 0 && 'text-destructive font-medium')}>
                        {formatCurrency(dd.endBalance)}
                      </p>
                    )}
                    {showCashGap && dd.hasCashGap && dd.endBalance < 0 && (
                      <Zap className="h-3.5 w-3.5 text-destructive animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Day Drill-Down Modal */}
      <Dialog open={selectedDay !== null && addType === null} onOpenChange={open => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedDay && selectedDayData && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <span>Operations for {format(selectedDay, 'dd.MM.yyyy')}</span>
                  <p className={cn(
                    'text-2xl font-bold mt-1',
                    selectedDayData.saldo >= 0 ? 'text-emerald-600' : 'text-destructive',
                  )}>
                    {selectedDayData.saldo >= 0 ? '+' : ''} {formatCurrency(selectedDayData.saldo)}
                  </p>
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[600px]">
                <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr] gap-2 px-2 text-[10px] font-semibold text-primary uppercase tracking-wider border-b pb-2">
                  <div>Date</div>
                  <div>Operation</div>
                  <div>Category/Description</div>
                  <div>Project</div>
                  <div>Counterparty</div>
                  <div>Account</div>
                </div>

                <div className="max-h-[300px] overflow-auto">
                  {selectedDayData.transactions.length === 0 && selectedDayData.planned.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Wallet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm">No operations</p>
                    </div>
                  ) : (
                    <>
                      {selectedDayData.transactions.map(t => (
                        <div key={t.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr] gap-2 px-2 py-2.5 text-sm border-b border-border/30">
                          <div>{format(parseISO(t.date), 'dd.MM.yyyy')}</div>
                          <div className={cn(t.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive', 'font-medium')}>
                            {t.type === 'INCOME' ? '+' : '–'} ${Number(t.amount).toLocaleString()}
                          </div>
                          <div>
                            <p className="font-medium">{getCategoryName(t.category_id) || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                          </div>
                          <div className="text-muted-foreground">{getProjectName(t.project_id) || '—'}</div>
                          <div className="text-muted-foreground">{getCounterpartyName(t.counterparty_id) || '—'}</div>
                          <div className="font-medium">{getAccountName(t.account_id)}</div>
                        </div>
                      ))}
                      {selectedDayData.planned.map(pp => (
                        <div key={pp.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr] gap-2 px-2 py-2.5 text-sm border-b border-border/30 opacity-60">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] bg-muted px-1 rounded">Plan</span>
                            {format(parseISO(pp.date), 'dd.MM.yyyy')}
                          </div>
                          <div className={cn(pp.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive', 'font-medium')}>
                            {pp.type === 'INCOME' ? '+' : '–'} ${Number(pp.amount).toLocaleString()}
                          </div>
                          <div>
                            <p className="font-medium">{getCategoryName(pp.category_id) || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{pp.description}</p>
                          </div>
                          <div className="text-muted-foreground">{getProjectName(pp.project_id) || '—'}</div>
                          <div className="text-muted-foreground">—</div>
                          <div className="font-medium">{getAccountName(pp.account_id)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Operations {selectedDayData.transactions.length + selectedDayData.planned.length}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={() => openAddFromDay('INCOME')}>
                      <TrendingUp className="h-3.5 w-3.5" /> + Add Income
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-primary/80 hover:bg-primary/70" onClick={() => openAddFromDay('EXPENSE')}>
                      <TrendingDown className="h-3.5 w-3.5" /> + Add Expense
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Transaction Sheet */}
      <Sheet open={addType !== null} onOpenChange={open => !open && setAddType(null)}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Add <span className="underline">{addType === 'INCOME' ? 'income' : 'expense'}</span> operation
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Amount *</Label>
                <Input type="number" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Account *</Label>
                <Select value={formAccountId} onValueChange={setFormAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {calculatedAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Category</Label>
                <Select value={formCategoryId || 'none'} onValueChange={v => setFormCategoryId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select category...</SelectItem>
                    {(addType === 'INCOME' ? incomeCategories : expenseCategories).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Date</Label>
                <Input value={selectedDay ? format(selectedDay, 'dd.MM.yyyy') : ''} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Project</Label>
                <Select value={formProjectId || 'none'} onValueChange={v => setFormProjectId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select project...</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Counterparty</Label>
                <Select value={formCounterpartyId || 'none'} onValueChange={v => setFormCounterpartyId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select counterparty..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select counterparty...</SelectItem>
                    {counterparties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Description</Label>
              <Textarea placeholder="Enter description..." value={formDescription} onChange={e => setFormDescription(e.target.value)} className="min-h-[80px]" />
            </div>
          </div>

          <div className="pt-4 border-t mt-auto">
            <Button onClick={handleAddSubmit} disabled={saving || !formAmount || !formAccountId} className="w-full">
              {saving ? 'Saving...' : 'Add Transaction'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Calendar;
