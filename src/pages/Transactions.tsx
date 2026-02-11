import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData, DbTransaction } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarIcon, Filter, Download, TrendingUp, TrendingDown, ArrowRightLeft, Trash2, X, Wallet, Building2 } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { exportToCsv } from '@/lib/exportCsv';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const transactionSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number'),
  account_id: z.string().min(1, 'Account is required'),
  to_account_id: z.string().optional(),
  category_id: z.string().optional(),
  date: z.date({ required_error: 'Date is required' }),
  project_id: z.string().optional(),
  counterparty_id: z.string().optional(),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

type ModalType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | null;
type ViewFilter = 'all' | 'actual' | 'planned';
type TypeFilter = 'all' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

interface UnifiedRow {
  id: string;
  date: string;
  type: string;
  amount: number;
  categoryId?: string;
  projectId?: string;
  counterpartyId?: string;
  accountId: string;
  toAccountId?: string;
  description: string;
  status: string;
  isPlanned: boolean;
}

const Transactions: React.FC = () => {
  const {
    transactions, plannedPayments, accounts, categories, projects, counterparties,
    setTransactions, setPlannedPayments, calculatedAccounts, companySettings, dateRange,
  } = useData();

  const [searchParams, setSearchParams] = useSearchParams();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState({ accountId: 'all', projectId: 'all', counterpartyId: 'all', categoryId: 'all' });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Form state
  const [formDateOpen, setFormDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultAccountId = companySettings?.default_account_id || (accounts.length > 0 ? accounts[0].id : '');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: '',
      account_id: defaultAccountId,
      to_account_id: '',
      category_id: '',
      date: new Date(),
      project_id: '',
      counterparty_id: '',
      description: '',
    },
  });

  const openModal = (type: ModalType) => {
    setEditingId(null);
    form.reset({
      amount: '',
      account_id: defaultAccountId,
      to_account_id: '',
      category_id: '',
      date: new Date(),
      project_id: '',
      counterparty_id: '',
      description: '',
    });
    setModalType(type);
  };

  const openEditModal = (row: UnifiedRow) => {
    setEditingId(row.id);
    form.reset({
      amount: String(row.amount),
      account_id: row.accountId,
      to_account_id: row.toAccountId || '',
      category_id: row.categoryId || '',
      date: parseISO(row.date),
      project_id: row.projectId || '',
      counterparty_id: row.counterpartyId || '',
      description: row.description || '',
    });
    setModalType(row.type as ModalType);
  };

  // Auto-open modal from header "Add New" button
  useEffect(() => {
    const addType = searchParams.get('add');
    if (addType && ['INCOME', 'EXPENSE', 'TRANSFER'].includes(addType)) {
      openModal(addType as ModalType);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const switchModalType = (newType: ModalType) => {
    setModalType(newType);
    // Reset category when switching between income/expense
    form.setValue('category_id', '');
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setSaving(true);
    const payload: any = {
      amount: parseFloat(values.amount),
      account_id: values.account_id,
      date: format(values.date, 'yyyy-MM-dd'),
      type: modalType!,
      status: 'APPROVED',
      description: values.description || '',
    };
    if (modalType === 'TRANSFER') {
      payload.to_account_id = values.to_account_id || null;
    } else {
      payload.category_id = values.category_id || null;
      payload.project_id = values.project_id || null;
      payload.counterparty_id = values.counterparty_id || null;
    }

    if (editingId) {
      const { data, error } = await supabase.from('transactions').update(payload).eq('id', editingId).select().single();
      if (!error && data) {
        setTransactions(prev => prev.map(t => t.id === editingId ? data as unknown as DbTransaction : t));
      }
    } else {
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (!error && data) {
        setTransactions(prev => [data as unknown as DbTransaction, ...prev]);
      }
    }
    setSaving(false);
    setEditingId(null);
    setModalType(null);
  };

  // Merge transactions and planned payments into unified list
  const unifiedRows = useMemo((): UnifiedRow[] => {
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const rows: UnifiedRow[] = [];

    if (viewFilter !== 'planned') {
      for (const t of transactions) {
        if (t.date < fromStr || t.date > toStr) continue;
        if (typeFilter !== 'all' && t.type !== typeFilter) continue;
        if (advFilters.accountId !== 'all' && t.account_id !== advFilters.accountId) continue;
        if (advFilters.projectId !== 'all' && t.project_id !== advFilters.projectId) continue;
        if (advFilters.counterpartyId !== 'all' && t.counterparty_id !== advFilters.counterpartyId) continue;
        if (advFilters.categoryId !== 'all' && t.category_id !== advFilters.categoryId) continue;
        rows.push({
          id: t.id, date: t.date, type: t.type, amount: Number(t.amount),
          categoryId: t.category_id || undefined, projectId: t.project_id || undefined,
          counterpartyId: t.counterparty_id || undefined, accountId: t.account_id,
          toAccountId: t.to_account_id || undefined, description: t.description || '',
          status: t.status, isPlanned: false,
        });
      }
    }

    if (viewFilter !== 'actual') {
      for (const pp of plannedPayments) {
        if (pp.date < fromStr || pp.date > toStr) continue;
        if (typeFilter !== 'all' && pp.type !== typeFilter) continue;
        if (advFilters.accountId !== 'all' && pp.account_id !== advFilters.accountId) continue;
        if (advFilters.projectId !== 'all' && pp.project_id !== advFilters.projectId) continue;
        if (advFilters.categoryId !== 'all' && pp.category_id !== advFilters.categoryId) continue;
        rows.push({
          id: pp.id, date: pp.date, type: pp.type, amount: Number(pp.amount),
          categoryId: pp.category_id || undefined, projectId: pp.project_id || undefined,
          accountId: pp.account_id, toAccountId: pp.to_account_id || undefined,
          description: pp.description || '', status: 'PLANNED', isPlanned: true,
        });
      }
    }

    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [transactions, plannedPayments, dateRange, viewFilter, typeFilter, advFilters]);

  // Group rows by time period
  const groupedRows = useMemo(() => {
    const groups: { label: string; rows: UnifiedRow[] }[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    let futureGroup: UnifiedRow[] = [];
    let todayGroup: UnifiedRow[] = [];
    let yesterdayGroup: UnifiedRow[] = [];
    let earlierGroup: UnifiedRow[] = [];

    for (const row of unifiedRows) {
      const d = parseISO(row.date);
      if (row.date > todayStr) {
        futureGroup.push(row);
      } else if (isToday(d)) {
        todayGroup.push(row);
      } else if (isYesterday(d)) {
        yesterdayGroup.push(row);
      } else {
        earlierGroup.push(row);
      }
    }

    if (futureGroup.length) groups.push({ label: 'Tomorrow and Later', rows: futureGroup });
    if (todayGroup.length) groups.push({ label: 'Today', rows: todayGroup });
    if (yesterdayGroup.length) groups.push({ label: 'Yesterday', rows: yesterdayGroup });
    if (earlierGroup.length) groups.push({ label: 'Earlier', rows: earlierGroup });

    return groups;
  }, [unifiedRows]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === unifiedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unifiedRows.map(r => r.id)));
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const txnIds = ids.filter(id => transactions.some(t => t.id === id));
    const ppIds = ids.filter(id => plannedPayments.some(pp => pp.id === id));

    if (txnIds.length) {
      await supabase.from('transactions').delete().in('id', txnIds);
      setTransactions(prev => prev.filter(t => !txnIds.includes(t.id)));
    }
    if (ppIds.length) {
      await supabase.from('planned_payments').delete().in('id', ppIds);
      setPlannedPayments(prev => prev.filter(pp => !ppIds.includes(pp.id)));
    }
    setSelectedIds(new Set());
  };

  const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || '';
  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name;
  const getCounterpartyName = (id?: string) => counterparties.find(c => c.id === id)?.name;
  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '';
  const getAccountLabel = (id?: string) => {
    const acc = calculatedAccounts.find(a => a.id === id);
    return acc ? `${acc.name} (${acc.currency})` : '';
  };

  const formatMoney = (amount: number, type: string) => {
    const formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (type === 'INCOME') return `+ ${formatted}`;
    if (type === 'EXPENSE') return `– ${formatted}`;
    return `→ ${formatted}`;
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === 'INCOME') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (type === 'EXPENSE') return <TrendingDown className="h-4 w-4 text-rose-600" />;
    return <ArrowRightLeft className="h-4 w-4 text-primary" />;
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const modalCategories = modalType === 'INCOME' ? incomeCategories : expenseCategories;

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      {/* Action buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" className="gap-1.5 bg-primary/90 hover:bg-primary/80" onClick={() => openModal('INCOME')}>
          <TrendingUp className="h-4 w-4" /> Income
        </Button>
        <Button size="sm" className="gap-1.5 bg-primary/70 hover:bg-primary/60" onClick={() => openModal('EXPENSE')}>
          <TrendingDown className="h-4 w-4" /> Expense
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openModal('TRANSFER')}>
          <ArrowRightLeft className="h-4 w-4" /> Transfer
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant={filterOpen ? 'default' : 'outline'} className="gap-1.5">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 space-y-3" align="start">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Properties</p>
            <Select value={advFilters.accountId} onValueChange={v => setAdvFilters(p => ({ ...p, accountId: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="All Accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={advFilters.projectId} onValueChange={v => setAdvFilters(p => ({ ...p, projectId: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={advFilters.counterpartyId} onValueChange={v => setAdvFilters(p => ({ ...p, counterpartyId: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="All Counterparties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counterparties</SelectItem>
                {counterparties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={advFilters.categoryId} onValueChange={v => setAdvFilters(p => ({ ...p, categoryId: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
              <Button size="sm" variant="outline" onClick={() => { setAdvFilters({ accountId: 'all', projectId: 'all', counterpartyId: 'all', categoryId: 'all' }); setFilterOpen(false); }}>Reset</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
          const rows = unifiedRows.map(row => ({
            date: row.date,
            type: row.type,
            amount: row.amount,
            description: row.description,
            category: getCategoryName(row.categoryId),
            counterparty: getCounterpartyName(row.counterpartyId) || '',
            project: getProjectName(row.projectId) || '',
            account: getAccountName(row.accountId),
          }));
          exportToCsv('transactions.csv', rows, [
            { key: 'date', label: 'Date' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'description', label: 'Description' },
            { key: 'category', label: 'Category' },
            { key: 'counterparty', label: 'Counterparty' },
            { key: 'project', label: 'Project' },
            { key: 'account', label: 'Account' },
          ]);
        }}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Filter bar row */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterBar />

        {/* Type filter pills */}
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="All Operations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="TRANSFER">Transfer</SelectItem>
          </SelectContent>
        </Select>

        {/* View filter */}
        <Select value={viewFilter} onValueChange={v => setViewFilter(v as ViewFilter)}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <SelectValue placeholder="Planned & Actual" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Planned & Actual</SelectItem>
            <SelectItem value="actual">Actual</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      <div className="min-w-[800px]">
      {/* Table Header */}
      <div className="grid grid-cols-[40px_1fr_1fr_1.5fr_1fr_1fr_1fr] items-center gap-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
        <div className="flex items-center justify-center">
          <Checkbox checked={selectedIds.size === unifiedRows.length && unifiedRows.length > 0} onCheckedChange={toggleAll} />
        </div>
        <div>Date</div>
        <div>Operation</div>
        <div>Category / Description</div>
        <div>Project</div>
        <div>Counterparty</div>
        <div>Account</div>
      </div>

      {/* Grouped Rows */}
      <div className="space-y-6">
        {groupedRows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No transactions for the selected period</div>
        )}
        {groupedRows.map(group => (
          <div key={group.label}>
            <h3 className="text-sm font-bold mb-3">{group.label}</h3>
            <div className="space-y-0">
              {group.rows.map(row => (
                <div
                  key={row.id}
                  className={cn(
                    'grid grid-cols-[40px_1fr_1fr_1.5fr_1fr_1fr_1fr] items-center gap-2 px-2 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors',
                    row.isPlanned && 'opacity-60',
                    row.type === 'TRANSFER' && 'bg-primary/[0.02]',
                    !row.isPlanned && 'cursor-pointer'
                  )}
                  onClick={() => { if (!row.isPlanned) openEditModal(row); }}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                  </div>
                  <div className="flex items-center gap-2">
                    {row.isPlanned && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Plan</span>
                    )}
                    <span className="text-sm">{format(parseISO(row.date), 'dd.MM.yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TypeIcon type={row.type} />
                    <span className={cn(
                      'text-sm font-medium',
                      row.type === 'INCOME' && 'text-emerald-600',
                      row.type === 'EXPENSE' && 'text-rose-600',
                      row.type === 'TRANSFER' && 'text-primary',
                    )}>
                      {formatMoney(row.amount, row.type)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getCategoryName(row.categoryId) || (row.type === 'TRANSFER' ? 'Account Transfer' : '—')}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    {getProjectName(row.projectId) || 'No project'}
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    {row.type === 'TRANSFER' ? '—' : (getCounterpartyName(row.counterpartyId) || 'No counterparty')}
                  </div>
                  <div className="text-sm font-medium">
                    {row.type === 'TRANSFER' ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-xs">{getAccountName(row.accountId)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs">{getAccountName(row.toAccountId)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="font-semibold">{getAccountLabel(row.accountId)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
      </div>

      {/* Bulk Action Footer */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-xl px-6 py-3 flex items-center gap-4 shadow-2xl">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm font-semibold">{selectedIds.size}</span>
          <span className="text-sm">selected</span>
          <div className="w-px h-5 bg-background/20" />
          <button onClick={() => setShowBulkDeleteConfirm(true)} className="flex items-center gap-2 text-sm hover:text-rose-400 transition-colors">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm hover:opacity-80 transition-opacity ml-2">
            Cancel
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected transactions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { bulkDelete(); setShowBulkDeleteConfirm(false); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Transaction Sidebar */}
      <Sheet open={modalType !== null} onOpenChange={open => { if (!open) { setModalType(null); setEditingId(null); } }}>
        <SheetContent className="w-[440px] sm:w-[440px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-lg">
              {editingId ? 'Edit' : 'Add'}{' '}
              {modalType === 'TRANSFER' ? (
                <span>transfer</span>
              ) : (
                <button
                  onClick={() => switchModalType(modalType === 'INCOME' ? 'EXPENSE' : 'INCOME')}
                  className="underline cursor-pointer hover:text-primary transition-colors"
                >
                  {modalType === 'INCOME' ? 'income' : 'expense'}
                </button>
              )}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.watch('amount')}
                  onChange={e => form.setValue('amount', e.target.value, { shouldValidate: true })}
                  autoFocus
                />
                {form.formState.errors.amount && (
                  <p className="text-sm font-medium text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">{modalType === 'TRANSFER' ? 'From Account *' : 'Account *'}</Label>
                <Select value={form.watch('account_id')} onValueChange={v => form.setValue('account_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {calculatedAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.account_id && (
                  <p className="text-sm font-medium text-destructive">{form.formState.errors.account_id.message}</p>
                )}
              </div>
            </div>

            {modalType === 'TRANSFER' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">To Account *</Label>
                <Select value={form.watch('to_account_id') || ''} onValueChange={v => form.setValue('to_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                  <SelectContent>
                    {calculatedAccounts.filter(a => a.id !== form.watch('account_id')).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modalType !== 'TRANSFER' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Category</Label>
                  <Select value={form.watch('category_id') || 'none'} onValueChange={v => form.setValue('category_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select category...</SelectItem>
                      {modalCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Date</Label>
                  <Popover open={formDateOpen} onOpenChange={setFormDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(form.watch('date'), 'dd.MM.yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.watch('date')} onSelect={d => { if (d) { form.setValue('date', d); setFormDateOpen(false); } }} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {modalType === 'TRANSFER' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Date</Label>
                <Popover open={formDateOpen} onOpenChange={setFormDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(form.watch('date'), 'dd.MM.yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.watch('date')} onSelect={d => { if (d) { form.setValue('date', d); setFormDateOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {modalType !== 'TRANSFER' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Project</Label>
                  <Select value={form.watch('project_id') || 'none'} onValueChange={v => form.setValue('project_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select project...</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Counterparty</Label>
                  <Select value={form.watch('counterparty_id') || 'none'} onValueChange={v => form.setValue('counterparty_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select counterparty..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select counterparty...</SelectItem>
                      {counterparties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Description</Label>
              <Textarea
                placeholder="Enter description..."
                value={form.watch('description') || ''}
                onChange={e => form.setValue('description', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Fixed bottom button */}
          <div className="border-t border-border px-6 py-4 bg-card">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Transactions;
