import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, DbCounterparty, DbTransaction } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Plus, Search, Building2, Users, Trash2, Save, Download,
} from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from '@/hooks/use-toast';

const BLUE_SHADES = [
  'hsl(228, 68%, 55%)', 'hsl(220, 70%, 50%)', 'hsl(210, 65%, 60%)',
  'hsl(200, 60%, 55%)', 'hsl(240, 50%, 65%)', 'hsl(215, 55%, 45%)',
];

const TYPE_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  CLIENT: { label: 'Client', color: 'hsl(142, 71%, 45%)', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VENDOR: { label: 'Vendor', color: 'hsl(262, 83%, 58%)', bgClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  CONTRACTOR: { label: 'Contractor', color: 'hsl(38, 92%, 50%)', bgClass: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? abs.toLocaleString('en-US') : abs.toString();
  return n < 0 ? `-$${s}` : `$${s}`;
};

const fmtSigned = (n: number) => {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? abs.toLocaleString('en-US') : abs.toString();
  return n > 0 ? `+$${s}` : n < 0 ? `-$${s}` : '$0';
};

// ======================== LIST VIEW ========================

const CounterpartyList: React.FC<{
  counterparties: DbCounterparty[];
  transactions: DbTransaction[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}> = ({ counterparties, transactions, onSelect, onAdd }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');

  const balances = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    const approved = transactions.filter(t => t.status === 'APPROVED' && t.type !== 'TRANSFER');
    for (const t of approved) {
      if (!t.counterparty_id) continue;
      if (!map[t.counterparty_id]) map[t.counterparty_id] = { income: 0, expense: 0 };
      if (t.type === 'INCOME') map[t.counterparty_id].income += Number(t.amount);
      else if (t.type === 'EXPENSE') map[t.counterparty_id].expense += Number(t.amount);
    }
    return map;
  }, [transactions]);

  const getBalance = (id: string) => {
    const b = balances[id];
    return b ? b.income - b.expense : 0;
  };

  const active = counterparties.filter(c => (c.status || 'ACTIVE') === 'ACTIVE');

  const filtered = useMemo(() => {
    return active.filter(c => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.tax_id || '').includes(q)) return false;
      }
      const bal = getBalance(c.id);
      if (debtFilter === 'RECEIVABLE' && bal <= 0) return false;
      if (debtFilter === 'PAYABLE' && bal >= 0) return false;
      return true;
    });
  }, [active, typeFilter, search, debtFilter, balances]);

  const totalReceivable = active.reduce((s, c) => { const b = getBalance(c.id); return b > 0 ? s + b : s; }, 0);
  const totalPayable = active.reduce((s, c) => { const b = getBalance(c.id); return b < 0 ? s + Math.abs(b) : s; }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Counterparties</h1>
          <p className="text-sm text-muted-foreground">Clients, vendors and contractors</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">They owe us</div>
            <div className="text-lg font-bold text-emerald-600">{fmtSigned(totalReceivable)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">We owe</div>
            <div className="text-lg font-bold text-rose-500">{fmtSigned(-totalPayable)}</div>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'CLIENT', 'VENDOR', 'CONTRACTOR'].map(t => (
          <button key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-xl transition-colors',
              typeFilter === t
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}>
            {t === 'ALL' ? 'All' : TYPE_CONFIG[t].label + 's'}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <Button size="sm" variant={debtFilter === 'RECEIVABLE' ? 'default' : 'outline'}
          onClick={() => setDebtFilter(debtFilter === 'RECEIVABLE' ? 'ALL' : 'RECEIVABLE')} className="text-xs">
          They owe us
        </Button>
        <Button size="sm" variant={debtFilter === 'PAYABLE' ? 'default' : 'outline'}
          onClick={() => setDebtFilter(debtFilter === 'PAYABLE' ? 'ALL' : 'PAYABLE')} className="text-xs">
          We owe
        </Button>
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or tax ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 w-64 h-9 text-sm" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>COUNTERPARTY</TableHead>
              <TableHead>TYPE</TableHead>
              <TableHead className="text-right">INCOME</TableHead>
              <TableHead className="text-right">EXPENSE</TableHead>
              <TableHead className="text-right">BALANCE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No counterparties found</TableCell></TableRow>
            )}
            {filtered.map(c => {
              const b = balances[c.id] || { income: 0, expense: 0 };
              const bal = b.income - b.expense;
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelect(c.id)}>
                  <TableCell>
                    {c.type === 'CLIENT' ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={TYPE_CONFIG[c.type]?.bgClass || ''}>
                        {TYPE_CONFIG[c.type]?.label || c.type}
                      </Badge>
                      {c.is_employee && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Employee
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{b.income > 0 ? fmt(b.income) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{b.expense > 0 ? fmt(b.expense) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className={`text-right font-semibold ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                    {bal !== 0 ? fmtSigned(bal) : '$0'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

// ======================== DETAIL VIEW ========================

const CounterpartyDetail: React.FC<{
  cp: DbCounterparty;
  transactions: DbTransaction[];
  onBack: () => void;
  onSave: (updates: Partial<DbCounterparty>) => void;
  onDelete: () => void;
  accounts: { id: string; name: string; currency: string }[];
  projects: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}> = ({ cp, transactions, onBack, onSave, onDelete, accounts, projects, categories }) => {
  const [form, setForm] = useState({ ...cp });
  const [tab, setTab] = useState('transactions');

  const cpTxns = useMemo(() =>
    transactions.filter(t => t.counterparty_id === cp.id && t.status === 'APPROVED').sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, cp.id]
  );

  const totalIncome = cpTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = cpTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  // Analytics data
  const dynamics = useMemo(() => {
    const now = new Date();
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const m = format(d, 'yyyy-MM');
      const label = format(d, 'MMM');
      const monthTxns = cpTxns.filter(t => t.date.startsWith(m));
      months.push({
        month: label,
        income: monthTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
        expense: monthTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return months;
  }, [cpTxns]);

  const structure = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const t of cpTxns) {
      const cat = categories.find(c => c.id === t.category_id);
      const name = cat?.name || 'Other';
      byCat[name] = (byCat[name] || 0) + Number(t.amount);
    }
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value], i) => ({
      name, value, pct: total ? Math.round((value / total) * 100) : 0, color: BLUE_SHADES[i % BLUE_SHADES.length],
    }));
  }, [cpTxns, categories]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{cp.name}</h1>
            <Badge variant="outline" className={TYPE_CONFIG[cp.type]?.bgClass || ''}>{TYPE_CONFIG[cp.type]?.label || cp.type}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}><Trash2 className="h-5 w-5" /></Button>
          <Button size="sm" onClick={() => onSave(form)}><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Balance</div>
          <div className={`text-2xl font-bold ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-500' : ''}`}>{fmt(Math.abs(balance))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Income</div>
          <div className="text-2xl font-bold">{fmt(totalIncome)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Expense</div>
          <div className="text-2xl font-bold">{fmt(totalExpense)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Operations</div>
          <div className="text-2xl font-bold">{cpTxns.length}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start gap-4 px-0 h-auto pb-0">
          {['transactions', 'details', 'analytics'].map(t => (
            <TabsTrigger key={t} value={t}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm capitalize">
              {t === 'transactions' ? 'Transaction History' : t === 'details' ? 'Details' : 'Analytics'}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Transaction History */}
        <TabsContent value="transactions">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                  <TableHead>DESCRIPTION / CATEGORY</TableHead>
                  <TableHead>PROJECT</TableHead>
                  <TableHead>ACCOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cpTxns.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No transactions</TableCell></TableRow>
                )}
                {cpTxns.map(t => {
                  const cat = categories.find(c => c.id === t.category_id);
                  const proj = projects.find(p => p.id === t.project_id);
                  const acc = accounts.find(a => a.id === t.account_id);
                  const sign = t.type === 'EXPENSE' ? -1 : 1;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{format(parseISO(t.date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell className={`text-right font-medium ${sign < 0 ? 'text-rose-500' : 'text-foreground'}`}>
                        {sign < 0 ? '−' : ''}{fmt(Number(t.amount))}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{cat?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{t.description || ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{proj?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{acc ? `${acc.name} (${acc.currency})` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details">
          <Card className="p-6 space-y-5">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Counterparty Type *</Label>
                <Select value={form.type} onValueChange={v => update('type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Tax ID</Label>
                <Input value={form.tax_id || ''} onChange={e => update('tax_id', e.target.value)} className="mt-1" placeholder="1234567890" />
              </div>
            </div>
            {form.type === 'CONTRACTOR' && (
              <div className="flex items-center gap-2">
                <Checkbox id="is_employee" checked={form.is_employee || false} onCheckedChange={v => update('is_employee', !!v)} />
                <Label htmlFor="is_employee">This is an employee</Label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
                <Input value={form.phone || ''} onChange={e => update('phone', e.target.value)} className="mt-1" placeholder="+1 (999) 000-00-00" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                <Input value={form.email || ''} onChange={e => update('email', e.target.value)} className="mt-1" placeholder="info@company.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Comment</Label>
              <Textarea value={form.comment || ''} onChange={e => update('comment', e.target.value)} className="mt-1" placeholder="Additional notes..." rows={3} />
            </div>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <span>📊</span> DYNAMICS (6 MO)
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamics}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="income" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <span>🕐</span> STRUCTURE (TOP 5)
              </div>
              <div className="h-52 flex items-center justify-center">
                {structure.length === 0 ? (
                  <span className="text-muted-foreground text-sm">No data</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={structure} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
                        {structure.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {structure.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ======================== CREATE DIALOG ========================

const CreateCounterpartyDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (cp: Partial<DbCounterparty>) => void;
}> = ({ open, onClose, onCreate }) => {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [type, setType] = useState<string>('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', tax_id: '', comment: '', is_employee: false });

  const reset = () => { setStep('type'); setType(''); setForm({ name: '', email: '', phone: '', tax_id: '', comment: '', is_employee: false }); };
  const handleClose = () => { reset(); onClose(); };

  const selectType = (t: string) => { setType(t); setStep('details'); };

  const submit = () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    onCreate({ ...form, type });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 'type' ? 'Select Counterparty Type' : `New ${TYPE_CONFIG[type]?.label || type}`}</DialogTitle>
          <DialogDescription>{step === 'type' ? 'Choose the role first' : 'Fill in the details'}</DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="grid grid-cols-1 gap-3 py-4">
            {(['CLIENT', 'VENDOR', 'CONTRACTOR'] as const).map(t => (
              <Button key={t} variant="outline" className="justify-start h-14 text-left" onClick={() => selectType(t)}>
                <div className="flex items-center gap-3">
                  {t === 'CLIENT' ? <Building2 className="h-5 w-5 text-emerald-600" /> : <Users className="h-5 w-5 text-purple-600" />}
                  <div>
                    <div className="font-medium">{TYPE_CONFIG[t].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {t === 'CLIENT' ? 'Source of revenue' : t === 'VENDOR' ? 'Service provider' : 'Project-based labor'}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="Company or person name" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Tax ID</Label>
              <Input value={form.tax_id} onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))} className="mt-1" placeholder="1234567890" />
            </div>
            {type === 'CONTRACTOR' && (
              <div className="flex items-center gap-2">
                <Checkbox id="new_emp" checked={form.is_employee} onCheckedChange={v => setForm(p => ({ ...p, is_employee: !!v }))} />
                <Label htmlFor="new_emp">This is an employee</Label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Comment</Label>
              <Textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('type')}>Back</Button>
              <Button onClick={submit}>Create</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ======================== MAIN PAGE ========================

const Counterparties: React.FC = () => {
  const { counterpartyId } = useParams();
  const navigate = useNavigate();
  const { counterparties, setCounterparties, transactions, accounts, projects, categories } = useData();
  const [showCreate, setShowCreate] = useState(false);

  const selected = counterpartyId ? counterparties.find(c => c.id === counterpartyId) : null;

  const handleSelect = (id: string) => navigate(`/counterparties/${id}`);
  const handleBack = () => navigate('/counterparties');

  const handleCreate = useCallback(async (data: Partial<DbCounterparty>) => {
    const { data: row, error } = await supabase.from('counterparties').insert({
      name: data.name!,
      type: data.type || 'CLIENT',
      email: data.email || '',
      phone: data.phone || '',
      tax_id: data.tax_id || '',
      comment: data.comment || '',
      is_employee: data.is_employee || false,
    }).select().single();
    if (error) { toast({ title: 'Error creating counterparty', description: error.message, variant: 'destructive' }); return; }
    if (row) {
      setCounterparties(prev => [...prev, row as unknown as DbCounterparty]);
      toast({ title: 'Counterparty created' });
    }
  }, [setCounterparties]);

  const handleSave = useCallback(async (updates: Partial<DbCounterparty>) => {
    if (!selected) return;
    const { error } = await supabase.from('counterparties').update({
      name: updates.name, type: updates.type, email: updates.email, phone: updates.phone,
      tax_id: updates.tax_id, comment: updates.comment, is_employee: updates.is_employee,
    }).eq('id', selected.id);
    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    setCounterparties(prev => prev.map(c => c.id === selected.id ? { ...c, ...updates } : c));
    toast({ title: 'Saved' });
  }, [selected, setCounterparties]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    const hasTxns = transactions.some(t => t.counterparty_id === selected.id);
    if (hasTxns) {
      // Archive instead of delete
      await supabase.from('counterparties').update({ status: 'ARCHIVED' }).eq('id', selected.id);
      setCounterparties(prev => prev.map(c => c.id === selected.id ? { ...c, status: 'ARCHIVED' } : c));
      toast({ title: 'Counterparty archived (has transaction history)' });
    } else {
      await supabase.from('counterparties').delete().eq('id', selected.id);
      setCounterparties(prev => prev.filter(c => c.id !== selected.id));
      toast({ title: 'Counterparty deleted' });
    }
    navigate('/counterparties');
  }, [selected, transactions, setCounterparties, navigate]);

  if (selected) {
    return (
      <CounterpartyDetail
        cp={selected}
        transactions={transactions}
        onBack={handleBack}
        onSave={handleSave}
        onDelete={handleDelete}
        accounts={accounts}
        projects={projects}
        categories={categories}
      />
    );
  }

  return (
    <>
      <CounterpartyList counterparties={counterparties} transactions={transactions} onSelect={handleSelect} onAdd={() => setShowCreate(true)} />
      <CreateCounterpartyDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
    </>
  );
};

export default Counterparties;
