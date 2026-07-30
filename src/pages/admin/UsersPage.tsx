import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Shield, Users, Truck, Shovel, User, FileText, Route, ExternalLink, Copy, Eye } from 'lucide-react';
import { AppRole, Profile } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicWebAppUrl } from '@/lib/publicWebUrl';

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

type PreviewLinkState = {
  actionLink: string;
  targetName: string;
  targetEmail: string;
};

const ALL_ROLES: AppRole[] = ['admin', 'manager', 'driver', 'shovel_crew', 'client', 'work_log_viewer'];
const PROTECTED_ADMIN_EMAILS = ['matthewstengel69@gmail.com'];

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-3 w-3" />;
    case 'manager': return <Users className="h-3 w-3" />;
    case 'driver': return <Truck className="h-3 w-3" />;
    case 'dispatch_driver': return <Route className="h-3 w-3" />;
    case 'shovel_crew': return <Shovel className="h-3 w-3" />;
    case 'trucker': return <Truck className="h-3 w-3" />;
    case 'work_log_viewer': return <FileText className="h-3 w-3" />;
    default: return <User className="h-3 w-3" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-destructive text-destructive-foreground';
    case 'manager': return 'bg-warning text-warning-foreground';
    case 'driver': return 'bg-plow text-plow-foreground';
    case 'dispatch_driver': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'shovel_crew': return 'bg-shovel text-shovel-foreground';
    case 'trucker': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'work_log_viewer': return 'bg-primary text-primary-foreground';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

export default function UsersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  
  // Managers can only assign non-admin roles
  const availableRoles = isAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'admin');
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingRole, setAddingRole] = useState<{ userId: string; role: AppRole } | null>(null);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});
  const [creatingPreviewUserId, setCreatingPreviewUserId] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<PreviewLinkState | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) {
      toast.error('Please select a role');
      return;
    }

    setAddingRole({ userId, role });
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Added ${role} role`);
      setSelectedRole((prev) => ({ ...prev, [userId]: '' as AppRole }));
      fetchUsers();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setAddingRole(null);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    // Managers cannot remove admin role
    if (!isAdmin && role === 'admin') {
      toast.error('Only admins can remove the admin role');
      return;
    }
    
    const roleId = `${userId}-${role}`;
    setRemovingRole(roleId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Removed ${role} role`);
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    } finally {
      setRemovingRole(null);
    }
  };

  const createPreviewLink = async (user: UserWithRoles) => {
    if (!isAdmin) {
      toast.error('Only admins can create preview links');
      return;
    }

    setCreatingPreviewUserId(user.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-preview-link', {
        body: {
          target_user_id: user.id,
          redirect_to: getPublicWebAppUrl('/auth/callback'),
        },
      });

      if (error) throw error;

      setPreviewLink({
        actionLink: data.action_link,
        targetName: data.target_user?.full_name || user.full_name || 'Unknown user',
        targetEmail: data.target_user?.email || user.email || 'No email',
      });
    } catch (error) {
      console.error('Error creating preview link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create preview link');
    } finally {
      setCreatingPreviewUserId(null);
    }
  };

  const copyPreviewLink = async () => {
    if (!previewLink) return;
    await navigator.clipboard.writeText(previewLink.actionLink);
    toast.success('Preview link copied');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <p className="text-muted-foreground">
          Manage user accounts and assign roles
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current Roles</TableHead>
              <TableHead>Add Role</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.full_name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => {
                        const isProtectedOwnerAdmin =
                          role === 'admin' &&
                          PROTECTED_ADMIN_EMAILS.includes((user.email ?? '').toLowerCase());
                        const canRemove = !isProtectedOwnerAdmin && (isAdmin || role !== 'admin');
                        return (
                          <Badge
                            key={role}
                            className={`${getRoleColor(role)} ${canRemove ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                            onClick={() => canRemove && removeRole(user.id, role)}
                            title={
                              isProtectedOwnerAdmin
                                ? 'This owner admin role is permanently protected'
                                : !canRemove
                                  ? 'Only admins can remove admin role'
                                  : undefined
                            }
                          >
                            {getRoleIcon(role)}
                            <span className="ml-1 capitalize">{role.replace('_', ' ')}</span>
                            {canRemove && (
                              removingRole === `${user.id}-${role}` ? (
                                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="ml-1 h-3 w-3" />
                              )
                            )}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedRole[user.id] || ''}
                      onValueChange={(value) =>
                        setSelectedRole((prev) => ({ ...prev, [user.id]: value as AppRole }))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.filter((r) => !user.roles.includes(r)).map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="capitalize">{role.replace('_', ' ')}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => addRole(user.id)}
                      disabled={!selectedRole[user.id] || addingRole?.userId === user.id}
                    >
                      {addingRole?.userId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={!isAdmin || !user.email || creatingPreviewUserId === user.id}
                    onClick={() => createPreviewLink(user)}
                  >
                    {creatingPreviewUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Preview
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(previewLink)} onOpenChange={(open) => !open && setPreviewLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview User Account</DialogTitle>
            <DialogDescription>
              Use this one-time sign-in link to test the app as <span className="font-medium text-foreground">{previewLink?.targetName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-100">
              Recommended: open this link in an incognito window or a different browser profile.
              Opening it in your current browser session will switch you out of your admin account.
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="font-medium text-foreground">{previewLink?.targetName}</p>
              <p className="text-muted-foreground">{previewLink?.targetEmail}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">One-time preview link</p>
              <p className="break-all text-xs text-muted-foreground">{previewLink?.actionLink}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" className="gap-2" onClick={copyPreviewLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => previewLink && window.open(previewLink.actionLink, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
              Open Preview Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
