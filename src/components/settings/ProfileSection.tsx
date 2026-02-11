import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Save } from 'lucide-react';

export const ProfileSection: React.FC = () => {
  const { user } = useAuth();
  const { profiles, refetchAll } = useData();

  const profile = profiles.find(p => p.user_id === user?.id);
  
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Update profile name
      if (profile) {
        await supabase.from('profiles').update({ name }).eq('id', profile.id);
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage('Passwords do not match');
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      await refetchAll();
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Profile updated successfully');
    } catch (err: any) {
      setMessage(err.message || 'Error updating profile');
    }
    setSaving(false);
  };

  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="max-w-xl space-y-6">
      <Card className="rounded-3xl">
        <CardContent className="pt-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold">{name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase">Full Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase">Email</Label>
            <Input value={email} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">Change Password</h3>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase">Confirm Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className={`text-sm ${message.includes('Error') || message.includes('match') ? 'text-destructive' : 'text-emerald-600'}`}>
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};
