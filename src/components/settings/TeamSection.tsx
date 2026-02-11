import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Check, Pencil, Trash2, RefreshCw, Eye, EyeOff, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export const TeamSection: React.FC<{ onDirty: () => void }> = ({ onDirty }) => {
  const { profiles, roles, refetchAll } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsView, setCredentialsView] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const openCreate = () => {
    setEditingProfile(null);
    setFormName('');
    setFormEmail('');
    setFormRole(roles[0]?.id || '');
    setFormPassword(generatePassword());
    setFormStatus('ACTIVE');
    setCredentialsView(null);
    setDialogOpen(true);
  };

  const openEdit = (profile: any) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormEmail(profile.email);
    setFormRole(profile.role_id || '');
    setFormPassword('');
    setFormStatus(profile.status);
    setCredentialsView(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = teamMemberSchema.safeParse({ name: formName, email: formEmail });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'name' | 'email';
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setFormErrors(fieldErrors);
      return;
    }
    setFormErrors({});
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: editingProfile
          ? {
              action: 'update',
              profile_id: editingProfile.id,
              user_id: editingProfile.user_id,
              name: formName,
              email: formEmail,
              role_id: formRole || null,
              password: formPassword || undefined,
              status: formStatus,
            }
          : {
              action: 'create',
              name: formName,
              email: formEmail,
              password: formPassword,
              role_id: formRole || null,
            },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!editingProfile) {
        setCredentialsView({ email: formEmail, password: formPassword });
      } else {
        setDialogOpen(false);
      }
      await refetchAll();
      onDirty();
    } catch (err: any) {
      console.error('Error managing user:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (profile: any) => {
    await supabase.functions.invoke('manage-user', {
      body: { action: 'delete', profile_id: profile.id, user_id: profile.user_id },
    });
    await refetchAll();
    onDirty();
  };

  const handleToggleStatus = async (profile: any) => {
    // Check if this is the main admin (system role)
    const role = roles.find(r => r.id === profile.role_id);
    if (role?.is_system) return; // Can't disable admin

    const newStatus = profile.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await supabase.functions.invoke('manage-user', {
      body: {
        action: 'update',
        profile_id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        role_id: profile.role_id,
        status: newStatus,
      },
    });
    await refetchAll();
    onDirty();
  };

  const handleCopy = () => {
    if (credentialsView) {
      navigator.clipboard.writeText(`Email: ${credentialsView.email}\nPassword: ${credentialsView.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return '';
    return roles.find(r => r.id === roleId)?.name || '';
  };

  const isAdmin = (profile: any) => {
    const role = roles.find(r => r.id === profile.role_id);
    return role?.is_system === true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Invite Member
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="pt-6 divide-y divide-border">
          {profiles.map(u => (
            <div key={u.id} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                {getInitials(u.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>

              {/* Role Badge */}
              {getRoleName(u.role_id) && (
                <Badge variant="outline" className="text-xs uppercase font-semibold shrink-0">
                  {getRoleName(u.role_id)}
                </Badge>
              )}

              {/* Power toggle */}
              <button
                onClick={() => handleToggleStatus(u)}
                disabled={isAdmin(u)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors shrink-0',
                  u.status === 'ACTIVE'
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-muted-foreground hover:bg-muted',
                  isAdmin(u) && 'opacity-40 cursor-not-allowed'
                )}
                title={isAdmin(u) ? 'Admin cannot be disabled' : u.status === 'ACTIVE' ? 'Disable user' : 'Enable user'}
              >
                <Power className="h-4 w-4" />
              </button>

              {/* Hover Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(u)} disabled={isAdmin(u)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No team members yet. Invite someone to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{credentialsView ? 'Credentials' : editingProfile ? 'Edit User' : 'Create User'}</DialogTitle>
          </DialogHeader>

          {credentialsView ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share these credentials with the new user:</p>
              <div className="p-4 bg-muted rounded-lg font-mono text-sm space-y-1">
                <p>Email: {credentialsView.email}</p>
                <p>Password: {credentialsView.password}</p>
              </div>
              <Button variant="outline" onClick={handleCopy} className="w-full">
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Full Name <span className="text-destructive">*</span></Label>
                <Input value={formName} onChange={e => { setFormName(e.target.value); if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined })); }} autoFocus />
                {formErrors.name && <p className="text-sm font-medium text-destructive">{formErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Email Address <span className="text-destructive">*</span></Label>
                <Input type="email" value={formEmail} onChange={e => { setFormEmail(e.target.value); if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined })); }} />
                {formErrors.email && <p className="text-sm font-medium text-destructive">{formErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Password</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-primary gap-1" onClick={() => setFormPassword(generatePassword())}>
                    <RefreshCw className="h-3 w-3" /> Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={editingProfile ? 'Leave blank to keep current' : ''}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {editingProfile && <p className="text-xs text-muted-foreground">Only fill this if you want to change the password.</p>}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!formName || !formEmail || loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { handleDelete(deleteTarget); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
