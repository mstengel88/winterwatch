import type { ElementType } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { OrganizationSummary } from "@/types/auth";
import {
  Bell,
  Building2,
  ChevronDown,
  Clock,
  History,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export interface HeaderNavItem {
  href: string;
  label: string;
  icon: ElementType;
}

interface AppHeaderWorkspaceSelectorProps {
  activeOrganizationId: string | null;
  disabled: boolean;
  organizations: OrganizationSummary[];
  onValueChange: (organizationId: string) => void;
  triggerClassName?: string;
}

export function AppHeaderWorkspaceSelector({
  activeOrganizationId,
  disabled,
  organizations,
  onValueChange,
  triggerClassName,
}: AppHeaderWorkspaceSelectorProps) {
  return (
    <Select
      disabled={disabled}
      value={activeOrganizationId ?? undefined}
      onValueChange={onValueChange}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AppHeaderAccountMenuProps {
  displayName: string;
  initials: string;
  isAdminOrManager: boolean;
  isMobile: boolean;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
}

export function AppHeaderAccountMenu({
  displayName,
  initials,
  isAdminOrManager,
  isMobile,
  onNavigate,
  onSignOut,
}: AppHeaderAccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("gap-2 rounded-full", isMobile ? "h-10 w-10 px-0" : "h-9 px-2")}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isMobile && <span className="hidden sm:inline text-sm text-foreground">{displayName.length > 12 ? `${displayName.slice(0, 12)}...` : displayName}</span>}
          {!isMobile && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNavigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {isAdminOrManager && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("/admin")}>
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/employees?tab=users")}>
              <UserCog className="mr-2 h-4 w-4" />
              Users & Roles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/customer-setup")}>
              <Building2 className="mr-2 h-4 w-4" />
              Customer Setup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/organizations")}>
              <Building2 className="mr-2 h-4 w-4" />
              Organizations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/leads")}>
              <Bell className="mr-2 h-4 w-4" />
              Website Leads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/employees")}>
              <Users className="mr-2 h-4 w-4" />
              Employees
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/accounts")}>
              <Building2 className="mr-2 h-4 w-4" />
              Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/equipment")}>
              <Wrench className="mr-2 h-4 w-4" />
              Equipment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/notifications")}>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/audit-log")}>
              <History className="mr-2 h-4 w-4" />
              Audit Log
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/admin/map")}>
              <MapPin className="mr-2 h-4 w-4" />
              Live Map
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/time-clock")}>
              <Clock className="mr-2 h-4 w-4" />
              Time Clock
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AppHeaderMobileMenuProps {
  activeOrganizationId: string | null;
  displayName: string;
  email: string | null | undefined;
  filteredNavItems: HeaderNavItem[];
  initials: string;
  isOpen: boolean;
  isSwitchingOrganization: boolean;
  organizations: OrganizationSummary[];
  onNavigate: (href: string) => void;
  onOpenChange: (open: boolean) => void;
  onOrganizationSwitch: (organizationId: string) => void;
  onSignOut: () => void;
}

export function AppHeaderMobileMenu({
  activeOrganizationId,
  displayName,
  email,
  filteredNavItems,
  initials,
  isOpen,
  isSwitchingOrganization,
  organizations,
  onNavigate,
  onOpenChange,
  onOrganizationSwitch,
  onSignOut,
}: AppHeaderMobileMenuProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-full">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-80 p-0">
        <SheetHeader className="border-b border-border/40 px-4 pb-4 pt-6 text-left">
          <SheetTitle className="flex items-center gap-2">
            <img src="/favicon.png" alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="font-semibold">WinterWatch-Pro</span>
              <span className="text-xs font-normal text-muted-foreground">Quick navigation</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {organizations.length > 1 && (
            <div className="mb-3 rounded-2xl border border-border/50 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active workspace
              </p>
              <AppHeaderWorkspaceSelector
                activeOrganizationId={activeOrganizationId}
                disabled={isSwitchingOrganization}
                organizations={organizations}
                onValueChange={onOrganizationSwitch}
                triggerClassName="h-10 rounded-xl border-border/50 bg-background/70 text-left"
              />
            </div>
          )}

          {filteredNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className="justify-start gap-3 h-12 rounded-2xl"
              onClick={() => onNavigate(item.href)}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start rounded-2xl"
              onClick={() => onNavigate("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-2xl"
              onClick={() => onNavigate("/settings")}
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
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
