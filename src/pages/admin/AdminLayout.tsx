import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Snowflake, LogOut, Users, Building2, Wrench, UserCog, ArrowLeft, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { href: string; label: string; icon: React.ElementType }[] = [];

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning">
              <Snowflake className="h-5 w-5 text-warning-foreground" />
            </div>
            <span className="text-lg font-semibold">Admin Panel</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-muted/30">
        <div className="container px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.href)}
                className={cn(
                  'shrink-0',
                  location.pathname === item.href && 'bg-secondary'
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
