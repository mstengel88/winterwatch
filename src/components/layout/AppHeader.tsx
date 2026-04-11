import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Shovel, ClipboardList, BarChart3, Bell, ChevronDown, LogOut, User, Settings, Clock, Menu, Shield, Truck, Users, Building2, Wrench, UserCog, History, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppRole } from '@/types/auth';
import logo from '@/assets/logo.png';

const APP_VERSION = '2.2';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Truck, roles: ['driver', 'admin', 'manager'] },
  { href: '/shovel', label: 'Shovel Crew', icon: Shovel, roles: ['shovel_crew', 'admin', 'manager'] },
  { href: '/trucker', label: 'Trucker', icon: Wrench, roles: ['trucker', 'admin', 'manager'] },
  { href: '/work-logs', label: 'Work Logs', icon: ClipboardList, roles: ['admin', 'manager', 'work_log_viewer'] },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin', 'manager'] },
];

export function AppHeader() {
  const { profile, signOut, hasRole, isAdminOrManager, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isNative } = useNativePlatform();
  const isMobile = useIsMobile();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications_log', filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications_log', filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  // Filter nav items based on user roles
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    // Check if user has any of the required roles
    return item.roles.some((role) => hasRole(role as AppRole));
  });

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const displayName = profile?.full_name || profile?.email || 'User';
  const shortName = displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName;
  const mobilePrimaryNav = filteredNavItems.slice(0, 4);

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    if (href === '/shovel') return location.pathname === href;
    if (href === '/trucker') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  // Determine home route based on role
  const getHomeRoute = () => {
    if (isAdminOrManager() || hasRole('driver')) {
      return '/dashboard';
    }
    if (hasRole('shovel_crew')) {
      return '/shovel';
    }
    if (hasRole('trucker')) {
      return '/trucker';
    }
    return '/';
  };

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        isNative && "pt-[env(safe-area-inset-top)]"
      )}>
        <div className={cn(
          "mx-auto flex items-center justify-between px-4",
          isMobile ? "h-16 max-w-full" : "h-14 max-w-6xl"
        )}>
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-80 p-0">
              <SheetHeader className="border-b border-border/40 px-4 pb-4 pt-6 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
                  <div className="flex flex-col">
                    <span className="font-semibold">WinterWatch-Pro</span>
                    <span className="text-xs font-normal text-muted-foreground">Quick navigation</span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {filteredNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Button
                      key={item.href}
                      variant={active ? 'secondary' : 'ghost'}
                      className={cn(
                        'justify-start gap-3 h-12 rounded-2xl',
                        active && 'bg-primary/10 text-primary border border-primary/30'
                      )}
                      onClick={() => handleNavigate(item.href)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  );
                })}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start rounded-2xl"
                    onClick={() => handleNavigate('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start rounded-2xl"
                    onClick={() => handleNavigate('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </nav>
              <div className="border-t border-border/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate(getHomeRoute())}
          >
            <img src={logo} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground leading-none hidden sm:inline">WinterWatch-Pro</span>
              <span className={cn(
                "text-[10px] leading-none text-muted-foreground",
                isMobile && "sm:hidden"
              )}>
                v{APP_VERSION}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {filteredNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Button
                key={item.href}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.href)}
                className={cn(
                  'h-8 gap-2 text-sm',
                  active && 'bg-primary/10 text-primary border border-primary/30'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full text-muted-foreground"
            onClick={() => {
              // Mark all as read when opening
              if (user && unreadCount > 0) {
                supabase
                  .from('notifications_log')
                  .update({ read_at: new Date().toISOString() })
                  .eq('user_id', user.id)
                  .is('read_at', null)
                  .then(() => setUnreadCount(0));
              }
              navigate('/admin/notifications');
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn(
                "gap-2 rounded-full",
                isMobile ? "h-10 w-10 px-0" : "h-9 px-2"
              )}>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && <span className="hidden sm:inline text-sm text-foreground">{shortName}</span>}
                {!isMobile && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {isAdminOrManager() && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Users & Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/employees')}>
                    <Users className="mr-2 h-4 w-4" />
                    Employees
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/accounts')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Accounts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/equipment')}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Equipment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/notifications')}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/audit-log')}>
                    <History className="mr-2 h-4 w-4" />
                    Audit Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/map')}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Live Map
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/time-clock')}>
                    <Clock className="mr-2 h-4 w-4" />
                    Time Clock
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </header>

      {isMobile && (
        <div className="ios-bottom-nav md:hidden">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {mobilePrimaryNav.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
              <span>More</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
