import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  user_id: string;
  role: string;
  profile?: { full_name: string | null; email: string | null };
  enabled: boolean;
}

export function MaintenanceNotificationSettings() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get admin/manager roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'manager']);

      if (rolesError) throw rolesError;

      const uniqueUserIds = [...new Set(roles?.map(r => r.user_id) || [])];
      if (uniqueUserIds.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);

      // Get existing notification settings
      const { data: settings } = await (supabase as any)
        .from('maintenance_notification_settings')
        .select('user_id, enabled')
        .in('user_id', uniqueUserIds);

      const settingsMap = new Map(
        (settings || []).map((s: any) => [s.user_id, s.enabled])
      );
      const profilesMap = new Map(
        (profiles || []).map(p => [p.id, { full_name: p.full_name, email: p.email }])
      );

      const adminUsers: AdminUser[] = uniqueUserIds.map(uid => {
        const role = roles?.find(r => r.user_id === uid);
        return {
          user_id: uid,
          role: role?.role || 'unknown',
          profile: profilesMap.get(uid) || undefined,
          enabled: settingsMap.has(uid) ? Boolean(settingsMap.get(uid)) : true,
        };
      });

      setUsers(adminUsers);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleUser = async (userId: string, enabled: boolean) => {
    setUpdatingId(userId);
    try {
      const { error } = await (supabase as any)
        .from('maintenance_notification_settings')
        .upsert(
          { user_id: userId, enabled },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, enabled } : u
      ));
      toast.success(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Maintenance Request Notifications
        </CardTitle>
        <CardDescription>
          Control which admins/managers receive push notifications when a maintenance request is submitted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin or manager users found.</p>
        ) : (
          users.map(user => (
            <div
              key={user.user_id}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div>
                <p className="font-medium text-sm">
                  {user.profile?.full_name || user.profile?.email || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <Switch
                checked={user.enabled}
                onCheckedChange={(checked) => toggleUser(user.user_id, checked)}
                disabled={updatingId === user.user_id}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
