import React, { useState } from 'react';
import { useData, DbCategoryGroup, DbCategory } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, FolderOpen, FolderClosed, Plus, Pencil, Trash2, Circle, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  onDirty: () => void;
  section?: 'categories' | 'accounts' | 'business_lines';
}

export const FinanceSection: React.FC<Props> = ({ onDirty, section = 'categories' }) => {
  const { categoryGroups, categories, accountGroups, accounts, businessLines, products, refetchAll } = useData();

  const [catDialog, setCatDialog] = useState<{ open: boolean; type: 'group' | 'item'; editId?: string; groupId?: string }>({ open: false, type: 'group' });
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<string>('EXPENSE');

  const [accDialog, setAccDialog] = useState<{ open: boolean; type: 'group' | 'item'; editId?: string; groupId?: string }>({ open: false, type: 'group' });
  const [accName, setAccName] = useState('');
  const [accBalance, setAccBalance] = useState('0');
  const [accCurrency, setAccCurrency] = useState('USD');

  // Business line state
  const [blDialog, setBlDialog] = useState<{ open: boolean; type: 'line' | 'product'; editId?: string; lineId?: string }>({ open: false, type: 'line' });
  const [blName, setBlName] = useState('');
  const [blPrice, setBlPrice] = useState('0');

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const all = new Set<string>();
    categoryGroups.forEach(g => all.add(g.id));
    accountGroups.forEach(g => all.add(g.id));
    businessLines.forEach(bl => all.add(bl.id));
    return all;
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Drag state for reordering (categories & accounts)
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragItemType, setDragItemType] = useState<'cat-group' | 'cat-item' | 'acc-group' | 'acc-item' | null>(null);

  // =================== CATEGORY CRUD ===================
  const saveCat = async () => {
    if (catDialog.type === 'group') {
      if (catDialog.editId) {
        await supabase.from('category_groups').update({ name: catName, type: catType }).eq('id', catDialog.editId);
      } else {
        await supabase.from('category_groups').insert({ name: catName, type: catType, sort_order: categoryGroups.length });
      }
    } else {
      if (catDialog.editId) {
        await supabase.from('categories').update({ name: catName }).eq('id', catDialog.editId);
      } else {
        const group = categoryGroups.find(g => g.id === catDialog.groupId);
        await supabase.from('categories').insert({ name: catName, group_id: catDialog.groupId!, type: group?.type || 'EXPENSE', sort_order: categories.length });
      }
    }
    setCatDialog({ open: false, type: 'group' });
    setCatName('');
    await refetchAll();
    onDirty();
  };

  const deleteCatGroup = async (id: string) => {
    await supabase.from('categories').delete().eq('group_id', id);
    await supabase.from('category_groups').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  const deleteCat = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  // Category drag-drop: reorder items within same type by swapping sort_order
  const handleCatItemDrop = async (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const dragCat = categories.find(c => c.id === dragId);
    const targetCat = categories.find(c => c.id === targetId);
    if (dragCat && targetCat) {
      await supabase.from('categories').update({ sort_order: targetCat.sort_order, group_id: targetCat.group_id }).eq('id', dragCat.id);
      await supabase.from('categories').update({ sort_order: dragCat.sort_order }).eq('id', targetCat.id);
      await refetchAll();
      onDirty();
    }
  };

  const handleCatGroupDrop = async (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const dragGroup = categoryGroups.find(g => g.id === dragId);
    const targetGroup = categoryGroups.find(g => g.id === targetId);
    if (dragGroup && targetGroup) {
      await supabase.from('category_groups').update({ sort_order: targetGroup.sort_order }).eq('id', dragGroup.id);
      await supabase.from('category_groups').update({ sort_order: dragGroup.sort_order }).eq('id', targetGroup.id);
      await refetchAll();
      onDirty();
    }
  };

  // =================== ACCOUNT CRUD ===================
  const saveAcc = async () => {
    if (accDialog.type === 'group') {
      if (accDialog.editId) {
        await supabase.from('account_groups').update({ name: accName }).eq('id', accDialog.editId);
      } else {
        await supabase.from('account_groups').insert({ name: accName, sort_order: accountGroups.length });
      }
    } else {
      if (accDialog.editId) {
        await supabase.from('accounts').update({ name: accName, opening_balance: Number(accBalance), currency: accCurrency }).eq('id', accDialog.editId);
      } else {
        await supabase.from('accounts').insert({ name: accName, group_id: accDialog.groupId!, opening_balance: Number(accBalance), currency: accCurrency, sort_order: accounts.length });
      }
    }
    setAccDialog({ open: false, type: 'group' });
    setAccName('');
    await refetchAll();
    onDirty();
  };

  const deleteAccGroup = async (id: string) => {
    await supabase.from('accounts').delete().eq('group_id', id);
    await supabase.from('account_groups').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  const deleteAcc = async (id: string) => {
    await supabase.from('accounts').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  const handleAccItemDrop = async (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const dragAcc = accounts.find(a => a.id === dragId);
    const targetAcc = accounts.find(a => a.id === targetId);
    if (dragAcc && targetAcc) {
      await supabase.from('accounts').update({ sort_order: targetAcc.sort_order, group_id: targetAcc.group_id }).eq('id', dragAcc.id);
      await supabase.from('accounts').update({ sort_order: dragAcc.sort_order }).eq('id', targetAcc.id);
      await refetchAll();
      onDirty();
    }
  };

  // =================== BUSINESS LINE CRUD ===================
  const saveBl = async () => {
    if (blDialog.type === 'line') {
      if (blDialog.editId) {
        await supabase.from('business_lines').update({ name: blName }).eq('id', blDialog.editId);
      } else {
        await supabase.from('business_lines').insert({ name: blName });
      }
    } else {
      if (blDialog.editId) {
        await supabase.from('products').update({ name: blName, price: Number(blPrice) }).eq('id', blDialog.editId);
      } else {
        await supabase.from('products').insert({ name: blName, business_line_id: blDialog.lineId!, price: Number(blPrice) });
      }
    }
    setBlDialog({ open: false, type: 'line' });
    setBlName('');
    setBlPrice('0');
    await refetchAll();
    onDirty();
  };

  const deleteBusinessLine = async (id: string) => {
    await supabase.from('products').delete().eq('business_line_id', id);
    await supabase.from('business_lines').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    await refetchAll();
    onDirty();
  };

  // =================== RENDER: CATEGORIES ===================
  const renderCategoryTree = () => {
    const expenseGroups = [...categoryGroups].filter(g => g.type === 'EXPENSE').sort((a, b) => a.sort_order - b.sort_order);
    const incomeGroups = [...categoryGroups].filter(g => g.type === 'INCOME').sort((a, b) => a.sort_order - b.sort_order);

    const renderGroup = (group: DbCategoryGroup) => {
      const groupItems = categories.filter(c => c.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
      const isExpanded = expanded.has(group.id);
      const isExpenseType = group.type === 'EXPENSE';

      return (
        <div key={group.id}>
          <div
            className={cn(
              "group flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all cursor-grab",
              dragOverId === group.id && 'ring-2 ring-primary/40',
            )}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragItemId(group.id); setDragItemType('cat-group'); }}
            onDragEnd={() => { setDragItemId(null); setDragItemType(null); setDragOverId(null); }}
            onDragOver={e => { e.preventDefault(); setDragOverId(group.id); }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => { e.preventDefault(); setDragOverId(null); if (dragItemType === 'cat-group' && dragItemId) handleCatGroupDrop(dragItemId, group.id); if (dragItemType === 'cat-item' && dragItemId) handleCatItemDrop(dragItemId, group.id); }}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <button onClick={() => toggleExpand(group.id)} className="shrink-0">
              {isExpanded
                ? <FolderOpen className="h-4 w-4 text-primary" />
                : <FolderClosed className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            <span className={cn("text-sm font-semibold flex-1", !isExpanded && "text-muted-foreground")}>{group.name}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCatName(group.name); setCatType(group.type); setCatDialog({ open: true, type: 'group', editId: group.id }); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCatGroup(group.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {isExpanded && groupItems.length > 0 && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-border/50 pl-0">
              {groupItems.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center gap-2 p-2.5 ml-2 rounded-xl border border-border/60 bg-card hover:shadow-sm transition-all cursor-grab",
                    dragOverId === item.id && 'ring-2 ring-primary/40',
                  )}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragItemId(item.id); setDragItemType('cat-item'); }}
                  onDragEnd={() => { setDragItemId(null); setDragItemType(null); setDragOverId(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(item.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => { e.preventDefault(); setDragOverId(null); if (dragItemType === 'cat-item' && dragItemId) handleCatItemDrop(dragItemId, item.id); }}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <Circle className="h-2.5 w-2.5 shrink-0" fill={isExpenseType ? '#EF4444' : '#22C55E'} stroke="none" />
                  <span className="text-sm flex-1">{item.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setCatName(item.name); setCatDialog({ open: true, type: 'item', editId: item.id, groupId: item.group_id }); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCat(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl">
          <CardContent className="pt-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Expense Categories</h3>
            <div className="space-y-2">{expenseGroups.map(renderGroup)}</div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setCatName(''); setCatType('EXPENSE'); setCatDialog({ open: true, type: 'group' }); }}>
                <Plus className="h-4 w-4 mr-1" /> Group
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                const firstGroup = expenseGroups[0];
                if (firstGroup) { setCatName(''); setCatDialog({ open: true, type: 'item', groupId: firstGroup.id }); }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Category
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="pt-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Income Categories</h3>
            <div className="space-y-2">{incomeGroups.map(renderGroup)}</div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setCatName(''); setCatType('INCOME'); setCatDialog({ open: true, type: 'group' }); }}>
                <Plus className="h-4 w-4 mr-1" /> Group
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                const firstGroup = incomeGroups[0];
                if (firstGroup) { setCatName(''); setCatDialog({ open: true, type: 'item', groupId: firstGroup.id }); }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Category
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // =================== RENDER: ACCOUNTS ===================
  const renderAccountTree = () => (
    <div className="space-y-1">
      {[...accountGroups].sort((a, b) => a.sort_order - b.sort_order).map(group => {
        const groupItems = accounts.filter(a => a.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
        const isExpanded = expanded.has(group.id);
        return (
          <div key={group.id}>
            <div className="group flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
              <button onClick={() => toggleExpand(group.id)} className="shrink-0">
                {isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <FolderClosed className="h-4 w-4 text-muted-foreground" />}
              </button>
              <span className={cn("text-sm font-semibold flex-1", !isExpanded && "text-muted-foreground")}>{group.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAccName(''); setAccBalance('0'); setAccDialog({ open: true, type: 'item', groupId: group.id }); }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAccName(group.name); setAccDialog({ open: true, type: 'group', editId: group.id }); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAccGroup(group.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="ml-6 mt-1 space-y-1 border-l-2 border-border/50">
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-2 p-2.5 ml-2 rounded-xl border border-border/60 bg-card hover:shadow-sm cursor-grab",
                      dragOverId === item.id && 'ring-2 ring-primary/40',
                    )}
                    draggable
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragItemId(item.id); setDragItemType('acc-item'); }}
                    onDragEnd={() => { setDragItemId(null); setDragItemType(null); setDragOverId(null); }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(item.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={e => { e.preventDefault(); setDragOverId(null); if (dragItemType === 'acc-item' && dragItemId) handleAccItemDrop(dragItemId, item.id); }}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="text-sm flex-1">{item.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{item.currency} • ${Number(item.opening_balance).toLocaleString()}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAccName(item.name); setAccBalance(String(item.opening_balance)); setAccCurrency(item.currency); setAccDialog({ open: true, type: 'item', editId: item.id, groupId: item.group_id }); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteAcc(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => { setAccName(''); setAccDialog({ open: true, type: 'group' }); }} className="mt-2">
        <Plus className="h-4 w-4 mr-1" /> Add Group
      </Button>
    </div>
  );

  // =================== RENDER: BUSINESS LINES ===================
  const renderBusinessLines = () => (
    <Card className="rounded-3xl">
      <CardContent className="pt-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Business Lines</h3>
        <div className="space-y-3">
          {businessLines.map(bl => {
            const blProducts = products.filter(p => p.business_line_id === bl.id);
            const isExpanded = expanded.has(bl.id);
            return (
              <div key={bl.id}>
                <div className="group flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/[0.02] hover:shadow-sm transition-all">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0" />
                  <button onClick={() => toggleExpand(bl.id)} className="shrink-0">
                    {isExpanded
                      ? <Layers className="h-4 w-4 text-primary" />
                      : <Layers className="h-4 w-4 text-muted-foreground" />
                    }
                  </button>
                  <span className={cn("text-sm font-semibold flex-1", !isExpanded && "text-muted-foreground")}>{bl.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBlName(''); setBlPrice('0'); setBlDialog({ open: true, type: 'product', lineId: bl.id }); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBlName(bl.name); setBlDialog({ open: true, type: 'line', editId: bl.id }); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBusinessLine(bl.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {isExpanded && blProducts.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-border/50">
                    {blProducts.map(prod => (
                      <div key={prod.id} className="group flex items-center gap-2 p-2.5 ml-2 rounded-xl border border-border/60 bg-card hover:shadow-sm">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{prod.name}</span>
                          <p className="text-xs text-muted-foreground">{prod.price} $</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setBlName(prod.name); setBlPrice(String(prod.price)); setBlDialog({ open: true, type: 'product', editId: prod.id, lineId: prod.business_line_id }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteProduct(prod.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => { setBlName(''); setBlDialog({ open: true, type: 'line' }); }}
          className="w-full mt-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Business Line
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {section === 'categories' && renderCategoryTree()}
      {section === 'accounts' && (
        <Card className="rounded-3xl max-w-2xl">
          <CardContent className="pt-6">{renderAccountTree()}</CardContent>
        </Card>
      )}
      {section === 'business_lines' && renderBusinessLines()}

      {/* Category Dialog */}
      <Dialog open={catDialog.open} onOpenChange={v => setCatDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catDialog.editId ? 'Edit' : 'Add'} {catDialog.type === 'group' ? 'Category Group' : 'Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} />
            </div>
            {catDialog.type === 'group' && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={catType} onValueChange={setCatType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {catDialog.type === 'item' && (
              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select value={catDialog.groupId || ''} onValueChange={v => setCatDialog(prev => ({ ...prev, groupId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {categoryGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name} ({g.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={saveCat} disabled={!catName}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={accDialog.open} onOpenChange={v => setAccDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{accDialog.editId ? 'Edit' : 'Add'} {accDialog.type === 'group' ? 'Account Group' : 'Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={accName} onChange={e => setAccName(e.target.value)} />
            </div>
            {accDialog.type === 'item' && (
              <>
                <div className="space-y-1.5">
                  <Label>Opening Balance</Label>
                  <Input type="number" value={accBalance} onChange={e => setAccBalance(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={accCurrency} onValueChange={setAccCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter><Button onClick={saveAcc} disabled={!accName}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Line / Product Dialog */}
      <Dialog open={blDialog.open} onOpenChange={v => setBlDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{blDialog.editId ? 'Edit' : 'Add'} {blDialog.type === 'line' ? 'Business Line' : 'Product'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={blName} onChange={e => setBlName(e.target.value)} />
            </div>
            {blDialog.type === 'product' && (
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input type="number" value={blPrice} onChange={e => setBlPrice(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={saveBl} disabled={!blName}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
