import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Home, Shovel, ClipboardList, BarChart3, Bell, ChevronDown, LogOut, User, Settings, Clock, Menu, Shield, Truck, Users, Building2, Wrench, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Truck, roles: ['driver', 'admin', 'manager'] },
  { href: '/shovel', label: 'Shovel Crew', icon: Shovel, roles: ['shovel_crew', 'admin', 'manager'] },
  { href: '/work-logs', label: 'Work Logs', icon: ClipboardList, roles: ['admin', 'manager', 'work_log_viewer'] },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin', 'manager'] },
];

export function AppHeader() {
  const { profile, signOut, hasRole, isAdminOrManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    return item.roles.some((role) => hasRole(role as any));
  });

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const displayName = profile?.full_name || profile?.email || 'User';
  const shortName = displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName;

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    if (href === '/shovel') return location.pathname === href;
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
    return '/';
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border/40 p-4">
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
                  <span className="font-semibold">WinterWatch-Pro</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-4 space-y-1">
                {filteredNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Button
                      key={item.href}
                      variant={active ? 'secondary' : 'ghost'}
                      className={cn(
                        'justify-start gap-3 h-11',
                        active && 'bg-primary/10 text-primary border border-primary/30'
                      )}
                      onClick={() => handleNavigate(item.href)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 border-t border-border/40 p-4">
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
            <span className="font-semibold text-foreground hidden sm:inline">WinterWatch-Pro</span>
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm text-foreground">{shortName}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
  );
}
