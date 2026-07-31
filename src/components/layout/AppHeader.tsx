import { lazy, Suspense, useState, type ElementType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shovel, ClipboardList, BarChart3, Menu, Shield, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppRole, OrganizationSummary } from '@/types/auth';

const AppHeaderNotificationBell = lazy(async () => {
  const module = await import('@/components/layout/AppHeaderNotificationBell');
  return { default: module.AppHeaderNotificationBell };
});

const AppHeaderWorkspaceSelector = lazy(async () => {
  const module = await import('@/components/layout/AppHeaderMenus');
  return { default: module.AppHeaderWorkspaceSelector };
});

const AppHeaderAccountMenu = lazy(async () => {
  const module = await import('@/components/layout/AppHeaderMenus');
  return { default: module.AppHeaderAccountMenu };
});

const AppHeaderMobileMenu = lazy(async () => {
  const module = await import('@/components/layout/AppHeaderMenus');
  return { default: module.AppHeaderMobileMenu };
});

const APP_VERSION = '4.2';
const APP_ICON = '/favicon.png';

interface NavItem {
  href: string;
  label: string;
  icon: ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Truck, roles: ['admin', 'manager', 'driver', 'dispatch_driver', 'trucker'] },
  { href: '/shovel', label: 'Shovel Crew', icon: Shovel, roles: ['admin', 'manager', 'shovel_crew'] },
  { href: '/work-logs', label: 'Work Logs', icon: ClipboardList, roles: ['admin', 'manager', 'work_log_viewer'] },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin', 'manager'] },
];

export function AppHeader() {
  const {
    profile,
    roles,
    signOut,
    hasRole,
    isAdminOrManager,
    user,
    organizations,
    activeOrganizationId,
    switchOrganization,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const { isNative } = useNativePlatform();
  const isMobile = useIsMobile();

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
  const mobilePrimaryNav = filteredNavItems.slice(0, 4);
  const isDispatchOnlyUser = false;
  const activeOrganization = organizations.find((organization) => organization.id === activeOrganizationId) ?? null;
  const headerMenuFallback = <div className="h-10 w-10" />;

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (!organizationId || organizationId === activeOrganizationId) return;

    setIsSwitchingOrganization(true);
    try {
      await switchOrganization(organizationId);
      if (location.pathname.startsWith('/admin/customer-setup')) {
        navigate('/admin/organizations');
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setIsSwitchingOrganization(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    if (href === '/shovel') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  // Determine home route based on role
  const getHomeRoute = () => {
    if (isAdminOrManager()) {
      return '/admin';
    }
    if (hasRole('driver') || hasRole('dispatch_driver') || hasRole('trucker')) {
      return '/dashboard';
    }
    if (hasRole('shovel_crew')) {
      return '/shovel';
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
          <Suspense fallback={headerMenuFallback}>
            <AppHeaderMobileMenu
              activeOrganizationId={activeOrganizationId}
              displayName={displayName}
              email={profile?.email}
              filteredNavItems={filteredNavItems}
              initials={initials}
              isOpen={mobileMenuOpen}
              isSwitchingOrganization={isSwitchingOrganization}
              organizations={organizations as OrganizationSummary[]}
              onNavigate={handleNavigate}
              onOpenChange={setMobileMenuOpen}
              onOrganizationSwitch={handleOrganizationSwitch}
              onSignOut={handleSignOut}
            />
          </Suspense>

          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate(getHomeRoute())}
          >
            <img src={APP_ICON} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground leading-none hidden sm:inline">WinterWatch-Pro</span>
              {!isMobile && activeOrganization && !isDispatchOnlyUser && (
                <span className="max-w-[180px] truncate text-[11px] leading-none text-muted-foreground">
                  {activeOrganization.name}
                </span>
              )}
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
          {!isDispatchOnlyUser && organizations.length > 1 && (
            <Suspense fallback={<div className="hidden h-9 w-[220px] md:block" />}>
              <AppHeaderWorkspaceSelector
                activeOrganizationId={activeOrganizationId}
                disabled={isSwitchingOrganization}
                organizations={organizations as OrganizationSummary[]}
                onValueChange={handleOrganizationSwitch}
                triggerClassName="hidden h-9 w-[220px] rounded-full border-border/50 bg-background/70 md:flex"
              />
            </Suspense>
          )}

          {!isDispatchOnlyUser && (
            <Suspense fallback={<div className="h-10 w-10" />}>
              <AppHeaderNotificationBell userId={user?.id} />
            </Suspense>
          )}

          <Suspense fallback={headerMenuFallback}>
            <AppHeaderAccountMenu
              displayName={displayName}
              initials={initials}
              isAdminOrManager={isAdminOrManager()}
              isMobile={isMobile}
              onNavigate={(href) => navigate(href)}
              onSignOut={handleSignOut}
            />
          </Suspense>
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
