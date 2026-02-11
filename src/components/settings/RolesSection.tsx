import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', group: 'Core' },
  { key: 'calendar', label: 'Payment Calendar', group: 'Core' },
  { key: 'transactions', label: 'Transactions', group: 'Finance' },
  { key: 'accounts', label: 'Accounts', group: 'Finance' },
  { key: 'categories', label: 'Categories', group: 'Finance' },
  { key: 'counterparties', label: 'Counterparties', group: 'Finance' },
  { key: 'projects', label: 'Projects', group: 'Business' },
  { key: 'reports', label: 'Reports', group: 'Business' },
  { key: 'settings', label: 'Settings', group: 'Business' },
];

const ACTIONS = ['view', 'edit', 'delete'] as const;

type Permission = Record<string, { view: boolean; edit: boolean; delete: boolean }>;

const defaultPermissions = (): Permission => {
  const perms: Permission = {};
  MODULES.forEach(m => {
    perms[m.key] = { view: true, edit: true, delete: true };
  });
  return perms;
};

export const RolesSection: React.FC<{ onDirty: () => void }> = ({ onDirty }) => {
  const { roles, refetchAll } = useData();
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [newRoleDialog, setNewRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingName, setEditingName] = useState('');

  const activeRole = useMemo(() => {
    if (!activeRoleId && roles.length > 0) return roles[0];
    return roles.find(r => r.id === activeRoleId) || roles[0] || null;
  }, [activeRoleId, roles]);

  const permissions: Permission = useMemo(() => {
    if (!activeRole) return defaultPermissions();
    const raw = activeRole.permissions;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Permission;
    return defaultPermissions();
  }, [activeRole]);

  const isSystem = (activeRole as any)?.is_system === true;

  const toggleAction = async (moduleKey: string, action: string) => {
    if (!activeRole || isSystem) return;
    const updated = { ...permissions };
    if (!updated[moduleKey]) {
      updated[moduleKey] = { view: false, edit: false, delete: false };
    }
    (updated[moduleKey] as any)[action] = !(updated[moduleKey] as any)[action];
    await supabase.from('roles').update({ permissions: updated as any }).eq('id', activeRole.id);
    await refetchAll();
    onDirty();
  };

  const createRole = async () => {
    if (!newRoleName) return;
    await supabase.from('roles').insert({ name: newRoleName, permissions: defaultPermissions() as any });
    setNewRoleDialog(false);
    setNewRoleName('');
    await refetchAll();
    onDirty();
  };

  const deleteRole = async () => {
    if (!activeRole || isSystem) return;
    if (!confirm('Delete this role?')) return;
    await supabase.from('roles').delete().eq('id', activeRole.id);
    setActiveRoleId(null);
    await refetchAll();
    onDirty();
  };

  const updateRoleName = async (name: string) => {
    if (!activeRole || isSystem) return;
    setEditingName(name);
    await supabase.from('roles').update({ name }).eq('id', activeRole.id);
    await refetchAll();
    onDirty();
  };

  React.useEffect(() => {
    if (activeRole) setEditingName(activeRole.name);
  }, [activeRole]);

  if (roles.length === 0) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setNewRoleDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Role</Button>
        <Dialog open={newRoleDialog} onOpenChange={setNewRoleDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Role Name</Label>
                <Input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} autoFocus />
              </div>
            </div>
            <DialogFooter><Button onClick={createRole} disabled={!newRoleName}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Tabs + Add */}
      <div className="flex items-center gap-1 flex-wrap">
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => setActiveRoleId(role.id)}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-[10px] transition-colors',
              (activeRole?.id === role.id)
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {role.name}
          </button>
        ))}
        <button
          onClick={() => setNewRoleDialog(true)}
          className="h-9 w-9 rounded-[10px] border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {activeRole && (
        <>
          {isSystem && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-xl text-muted-foreground text-sm">
              <Lock className="h-4 w-4" />
              System role permissions cannot be edited.
            </div>
          )}

          {!isSystem && (
            <div className="flex items-center gap-3">
              <Input
                value={editingName}
                onChange={e => updateRoleName(e.target.value)}
                className="max-w-xs text-sm font-medium"
                placeholder="Role name"
              />
              <Button variant="outline" size="sm" onClick={deleteRole} className="text-destructive gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}

          {/* Permission Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULES.map(mod => {
              const perm = permissions[mod.key] || { view: false, edit: false, delete: false };
              return (
                <Card key={mod.key} className="rounded-3xl">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold">{mod.label}</p>
                      <Badge variant="outline" className="text-[10px] font-medium uppercase">
                        {mod.group}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6">
                      {ACTIONS.map(action => (
                        <label key={action} className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={(perm as any)[action]}
                            onCheckedChange={() => toggleAction(mod.key, action)}
                            disabled={isSystem}
                            className="data-[state=checked]:bg-primary"
                          />
                          <span className="text-sm capitalize">{action === 'view' ? 'View' : action === 'edit' ? 'Edit' : 'Delete'}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* New Role Dialog */}
      <Dialog open={newRoleDialog} onOpenChange={setNewRoleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter><Button onClick={createRole} disabled={!newRoleName}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
