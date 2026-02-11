import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Building2, Users2, CalendarDays, BarChart3, Settings, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const MAIN_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/projects', label: 'Projects', icon: Building2 },
  { to: '/counterparties', label: 'Counterparties', icon: Users2 },
  { to: '/calendar', label: 'Payment Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const TOOLS_NAV = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const AppSidebar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Try to get user's role name
  let roleName = 'User';
  try {
    const { profiles, roles } = useData();
    const profile = profiles.find(p => p.user_id === user?.id);
    if (profile?.role_id) {
      const role = roles.find(r => r.id === profile.role_id);
      if (role) roleName = role.name;
    }
  } catch {}

  const renderLink = ({ to, label, icon: Icon }: typeof MAIN_NAV[0]) => {
    const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Link
        key={to}
        to={to}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  };

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setLogoutConfirm(false);
    signOut();
  };

  const handleProfileClick = () => {
    navigate('/settings?section=profile');
  };

  return (
    <>
      <aside className="w-60 bg-sidebar flex flex-col border-r border-sidebar-border h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
            A
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">Antigravity</span>
        </div>

        {/* Main */}
        <div className="px-3 mt-2">
          <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-2">Main</p>
          <nav className="space-y-0.5">
            {MAIN_NAV.map(renderLink)}
          </nav>
        </div>

        {/* Tools */}
        <div className="px-3 mt-6">
          <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-2">Tools</p>
          <nav className="space-y-0.5">
            {TOOLS_NAV.map(renderLink)}
          </nav>
        </div>

        <div className="flex-1" />

        {/* User Profile - fixed at bottom */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg">
            <button onClick={handleProfileClick} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{roleName}</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to sign out?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutConfirm(false)}>Cancel</Button>
            <Button onClick={confirmLogout}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
