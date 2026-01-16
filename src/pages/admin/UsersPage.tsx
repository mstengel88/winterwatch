import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserCog, Plus, Trash2, Loader2, Shield, Users, Truck, Shovel, User } from 'lucide-react';
import { AppRole, Profile } from '@/types/auth';

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

const ROLES: AppRole[] = ['admin', 'manager', 'driver', 'shovel_crew', 'client'];

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-3 w-3" />;
    case 'manager': return <Users className="h-3 w-3" />;
    case 'driver': return <Truck className="h-3 w-3" />;
    case 'shovel_crew': return <Shovel className="h-3 w-3" />;
    default: return <User className="h-3 w-3" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-destructive text-destructive-foreground';
    case 'manager': return 'bg-warning text-warning-foreground';
    case 'driver': return 'bg-plow text-plow-foreground';
    case 'shovel_crew': return 'bg-shovel text-shovel-foreground';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingRole, setAddingRole] = useState<{ userId: string; role: AppRole } | null>(null);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {users.length} registered user{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead>Add Role</TableHead>
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
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              className={`${getRoleColor(role)} cursor-pointer`}
                              onClick={() => removeRole(user.id, role)}
                            >
                              {getRoleIcon(role)}
                              <span className="ml-1 capitalize">{role.replace('_', ' ')}</span>
                              {removingRole === `${user.id}-${role}` ? (
                                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="ml-1 h-3 w-3" />
                              )}
                            </Badge>
                          ))
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
                            {ROLES.filter((r) => !user.roles.includes(r)).map((role) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
