import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, Plus, Loader2, Truck, Shovel, Search, Upload, MoreHorizontal, Pencil, Trash2, Clock, Shield, User, FileText, Route, Eye } from 'lucide-react';
import { Employee, EmployeeCategory } from '@/types/database';
import { AppRole, Profile } from '@/types/auth';
import { validateEmployeeForm } from '@/lib/validation/employee';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentWebAppUrl, getPublicWebAppUrl } from '@/lib/publicWebUrl';

const OvertimeNotificationSettings = lazy(async () => {
  const module = await import('@/components/admin/OvertimeNotificationSettings');
  return { default: module.OvertimeNotificationSettings };
});

const EmployeeEditorDialog = lazy(() => import('@/components/admin/team-management/EmployeeEditorDialog'));
const WorkspaceInviteDialog = lazy(() => import('@/components/admin/team-management/WorkspaceInviteDialog'));
const PreviewLinkDialog = lazy(() => import('@/components/admin/team-management/PreviewLinkDialog'));

const CATEGORIES: EmployeeCategory[] = ['plow', 'shovel', 'both', 'manager', 'trucker'];
const ALL_ROLES: AppRole[] = ['admin', 'manager', 'driver', 'shovel_crew', 'client', 'work_log_viewer'];
const PROTECTED_ADMIN_EMAILS = ['matthewstengel69@gmail.com'];

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

type WorkspaceInviteForm = {
  full_name: string;
  email: string;
  phone: string;
  role: AppRole;
  create_employee: boolean;
  employee_category: EmployeeCategory;
  employee_id: string;
};

type PreviewLinkState = {
  actionLink: string;
  targetName: string;
  targetEmail: string;
};

const getDefaultEmployeeCategoryForRole = (role: AppRole): EmployeeCategory => {
  switch (role) {
    case 'driver':
    case 'dispatch_driver':
      return 'plow';
    case 'shovel_crew':
      return 'shovel';
    case 'trucker':
      return 'trucker';
    default:
      return 'manager';
  }
};

const getRoleIcon = (role: AppRole) => {
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

const getRoleColor = (role: AppRole) => {
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

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, activeOrganizationId } = useAuth();
  const isAdmin = hasRole('admin');
  const availableRoles = isAdmin ? ALL_ROLES : ALL_ROLES.filter((role) => role !== 'admin');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRolesByUserId, setUserRolesByUserId] = useState<Record<string, AppRole[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'users' ? 'users' : 'employees');
  const [addingRole, setAddingRole] = useState<{ userId: string; role: AppRole } | null>(null);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});
  const [creatingPreviewUserId, setCreatingPreviewUserId] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<PreviewLinkState | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [workspaceInviteForm, setWorkspaceInviteForm] = useState<WorkspaceInviteForm>({
    full_name: '',
    email: '',
    phone: '',
    role: 'manager',
    create_employee: true,
    employee_category: 'manager',
    employee_id: '',
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    category: 'both' as EmployeeCategory,
    hourly_rate: '',
    user_id: '',
    is_active: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    if (!activeOrganizationId) {
      setEmployees([]);
      setProfiles([]);
      setUserRolesByUserId({});
      setIsLoading(false);
      return;
    }
    try {
      const [employeesRes, rolesRes] = await Promise.all([
        supabase.from('employees').select('*').filter('organization_id', 'eq', activeOrganizationId).order('last_name'),
        supabase.from('user_roles').select('user_id, role').eq('organization_id', activeOrganizationId),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const employeeRows = employeesRes.data || [];
      const roleRows = rolesRes.data || [];
      const profileIds = Array.from(new Set([
        ...employeeRows.map((employee) => employee.user_id).filter((value): value is string => Boolean(value)),
        ...roleRows.map((row) => row.user_id),
      ]));

      const profilesRes = profileIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', profileIds)
        : { data: [], error: null };

      if (profilesRes.error) throw profilesRes.error;

      setEmployees(employeeRows);
      setProfiles(profilesRes.data || []);
      const groupedRoles = roleRows.reduce<Record<string, AppRole[]>>((accumulator, row) => {
        if (!accumulator[row.user_id]) {
          accumulator[row.user_id] = [];
        }
        accumulator[row.user_id].push(row.role as AppRole);
        return accumulator;
      }, {});

      setUserRolesByUserId(groupedRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrganizationId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab === 'users' ? 'users' : 'employees');
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new-employee') {
      openDialog();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (action === 'invite-user') {
      setActiveTab('users');
      setIsInviteDialogOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'users');
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const openDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        phone: employee.phone || '',
        category: employee.category,
        hourly_rate: employee.hourly_rate?.toString() || '',
        user_id: employee.user_id || '',
        is_active: employee.is_active,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        category: 'both',
        hourly_rate: '',
        user_id: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const setTab = (value: string) => {
    setActiveTab(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'employees') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSave = async () => {
    if (!activeOrganizationId) {
      toast.error('Select an organization before creating an employee');
      return;
    }

    // Validate form data with zod schema
    const validationResult = validateEmployeeForm(formData);
    if (!validationResult.success) {
      toast.error(validationResult.error);
      return;
    }

    setIsSaving(true);
    try {
      const validated = validationResult.data;

      if (validated.user_id) {
        const duplicateLinkedEmployee = employees.find(
          (employee) =>
            employee.user_id === validated.user_id &&
            employee.id !== editingEmployee?.id,
        );

        if (duplicateLinkedEmployee) {
          toast.error(
            `${duplicateLinkedEmployee.first_name} ${duplicateLinkedEmployee.last_name} is already linked to that user account.`,
          );
          return;
        }
      }

      const employeeData = {
        organization_id: activeOrganizationId,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email || null,
        phone: validated.phone || null,
        category: validated.category,
        hourly_rate: validated.hourly_rate ? parseFloat(validated.hourly_rate) : null,
        user_id: validated.user_id || null,
        is_active: formData.is_active,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id)
          .filter('organization_id', 'eq', activeOrganizationId!);
        if (error) throw error;
        toast.success('Employee updated');
      } else {
        const { error } = await supabase.from('employees').insert(employeeData);
        if (error) throw error;
        toast.success('Employee created');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving employee:', error);
      const description =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: string }).message === 'string'
          ? (error as { message: string }).message
          : 'Failed to save employee';

      toast.error(description);
    } finally {
      setIsSaving(false);
    }
  };

  const openInviteDialog = () => {
    setWorkspaceInviteForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'manager',
      create_employee: true,
      employee_category: 'manager',
      employee_id: '',
    });
    setIsInviteDialogOpen(true);
  };

  const openInviteDialogForEmployee = (employee: Employee) => {
    setTab('users');
    setWorkspaceInviteForm({
      full_name: `${employee.first_name} ${employee.last_name}`.trim(),
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      role: employee.category === 'shovel' ? 'shovel_crew' : employee.category === 'trucker' ? 'trucker' : employee.category === 'manager' ? 'manager' : 'driver',
      create_employee: true,
      employee_category: employee.category,
      employee_id: employee.id,
    });
    setIsInviteDialogOpen(true);
  };

  const openDialogForUser = (user: UserWithRoles) => {
    const [firstName = '', ...rest] = (user.full_name ?? '').trim().split(/\s+/);
    const lastName = rest.join(' ');
    const inferredRole = user.roles[0] ?? 'manager';

    setEditingEmployee(null);
    setFormData({
      first_name: firstName || user.email?.split('@')[0] || '',
      last_name: lastName,
      email: user.email || '',
      phone: user.phone || '',
      category: getDefaultEmployeeCategoryForRole(inferredRole),
      hourly_rate: '',
      user_id: user.id,
      is_active: true,
    });
    setTab('employees');
    setIsDialogOpen(true);
  };

  const handleInviteWorkspaceUser = async () => {
    if (!activeOrganizationId) {
      toast.error('Select an organization first');
      return;
    }

    if (!workspaceInviteForm.full_name.trim() || !workspaceInviteForm.email.trim()) {
      toast.error('Full name and email are required');
      return;
    }

    setIsInvitingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-workspace-user', {
        body: {
          organization_id: activeOrganizationId,
          full_name: workspaceInviteForm.full_name.trim(),
          email: workspaceInviteForm.email.trim(),
          phone: workspaceInviteForm.phone.trim() || undefined,
          role: workspaceInviteForm.role,
          create_employee: workspaceInviteForm.create_employee,
          employee_category: workspaceInviteForm.employee_category,
          employee_id: workspaceInviteForm.employee_id || undefined,
          invite_redirect_to: getPublicWebAppUrl('/auth/callback'),
        },
      });

      if (error) throw error;

      toast.success(
        data?.invited
          ? 'Workspace user invited'
          : 'Workspace access linked to existing user',
      );
      setIsInviteDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error inviting workspace user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to invite workspace user');
    } finally {
      setIsInvitingUser(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .filter('organization_id', 'eq', activeOrganizationId!);
      if (error) throw error;
      toast.success('Employee deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const addRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) {
      toast.error('Select a role first');
      return;
    }

    setAddingRole({ userId, role });
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role,
        organization_id: activeOrganizationId!,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Added ${role.replace('_', ' ')} role`);
      setSelectedRole((current) => ({ ...current, [userId]: '' as AppRole }));
      await fetchData();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setAddingRole(null);
    }
  };

  const removeRole = async (user: Profile, role: AppRole) => {
    if (!isAdmin && role === 'admin') {
      toast.error('Only admins can remove the admin role');
      return;
    }

    if (role === 'admin' && PROTECTED_ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
      toast.error('This owner admin role is permanently protected');
      return;
    }

    const roleId = `${user.id}-${role}`;
    setRemovingRole(roleId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', role)
        .eq('organization_id', activeOrganizationId!);

      if (error) throw error;

      toast.success(`Removed ${role.replace('_', ' ')} role`);
      await fetchData();
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
          redirect_to: getPublicWebAppUrl('/auth/callback?preview=1&next=/app'),
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

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const searchLower = search.toLowerCase();
    return employees.filter(emp => 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower)
    );
  }, [employees, search]);

  // Stats
  const stats = useMemo(() => {
    const active = employees.filter(e => e.is_active).length;
    const plow = employees.filter(e => e.category === 'plow' || e.category === 'both').length;
    const shovel = employees.filter(e => e.category === 'shovel' || e.category === 'both').length;
    return { total: employees.length, active, plow, shovel };
  }, [employees]);

  const employeeProfilesById = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const availableProfilesForDialog = useMemo(
    () =>
      profiles.filter((profile) => {
        const linkedEmployee = employees.find((employee) => employee.user_id === profile.id);
        if (!linkedEmployee) return true;
        return linkedEmployee.id === editingEmployee?.id;
      }),
    [profiles, employees, editingEmployee?.id],
  );

  const usersWithRoles = useMemo<UserWithRoles[]>(() => {
    return profiles
      .map((profile) => ({
        ...profile,
        roles: userRolesByUserId[profile.id] ?? [],
      }))
      .filter((profile) =>
        profile.roles.length > 0 ||
        employees.some((employee) => employee.user_id === profile.id),
      )
      .sort((left, right) =>
        (left.full_name || left.email || '').localeCompare(right.full_name || right.email || ''),
      );
  }, [profiles, userRolesByUserId, employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dialogFallback = (
    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading…
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage employees and user accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 border border-border/50 h-auto flex-wrap">
          <TabsTrigger value="employees" className="data-[state=active]:bg-secondary gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Employees</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-secondary gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Users</span>
          </TabsTrigger>
          <TabsTrigger value="overtime" className="data-[state=active]:bg-secondary gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Overtime</span>
          </TabsTrigger>
        </TabsList>

          <TabsContent value="employees" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold text-primary">{stats.plow}</p>
                <p className="text-xs text-muted-foreground">Plow</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold text-shovel">{stats.shovel}</p>
                <p className="text-xs text-muted-foreground">Shovel</p>
              </CardContent>
            </Card>
          </div>

          {/* Import Button */}
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>

          {/* Search and Add */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/50"
                  />
                </div>
                <Button onClick={() => openDialog()} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Add Employee
                </Button>
              </div>

              {/* Employee Table */}
              <div className="rounded-lg border border-border/50 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-muted/30">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Crew Role</th>
                      <th className="px-4 py-3 font-medium">App Access</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {employee.category === 'plow' && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                              <Truck className="h-3 w-3" />
                              Plow
                            </Badge>
                          )}
                          {employee.category === 'shovel' && (
                            <Badge className="bg-shovel/20 text-shovel border-shovel/30 gap-1">
                              <Shovel className="h-3 w-3" />
                              Shovel
                            </Badge>
                          )}
                          {employee.category === 'both' && (
                            <div className="flex gap-1">
                              <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                                <Truck className="h-3 w-3" />
                                Plow
                              </Badge>
                              <Badge className="bg-shovel/20 text-shovel border-shovel/30 gap-1">
                                <Shovel className="h-3 w-3" />
                                Shovel
                              </Badge>
                            </div>
                          )}
                          {employee.category === 'manager' && (
                            <Badge className="bg-muted text-muted-foreground border-border gap-1">
                              <Users className="h-3 w-3" />
                              Manager
                            </Badge>
                          )}
                          {employee.category === 'trucker' && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
                              <Truck className="h-3 w-3" />
                              Trucker
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {employee.user_id ? (
                            <div className="space-y-2">
                              <div className="text-sm">
                                <p className="font-medium">{employeeProfilesById[employee.user_id]?.full_name || 'Linked user'}</p>
                                <p className="text-xs text-muted-foreground">{employeeProfilesById[employee.user_id]?.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(userRolesByUserId[employee.user_id] ?? []).length > 0 ? (
                                  (userRolesByUserId[employee.user_id] ?? []).map((role) => {
                                    const isProtectedOwnerAdmin =
                                      role === 'admin' &&
                                      PROTECTED_ADMIN_EMAILS.includes((employeeProfilesById[employee.user_id]?.email ?? '').toLowerCase());
                                    const canRemove = !isProtectedOwnerAdmin && (isAdmin || role !== 'admin');

                                    return (
                                      <Badge
                                        key={`${employee.id}-${role}`}
                                        className={`${getRoleColor(role)} ${canRemove ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                                        onClick={() => canRemove && employee.user_id && removeRole(employeeProfilesById[employee.user_id], role)}
                                        title={
                                          isProtectedOwnerAdmin
                                            ? 'This owner admin role is permanently protected'
                                            : !canRemove
                                              ? 'Only admins can remove admin role'
                                              : 'Click to remove role'
                                        }
                                      >
                                        {getRoleIcon(role)}
                                        <span className="ml-1 capitalize">{role.replace('_', ' ')}</span>
                                        {canRemove && (
                                          removingRole === `${employee.user_id}-${role}` ? (
                                            <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="ml-1 h-3 w-3" />
                                          )
                                        )}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-muted-foreground">No app roles yet</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={selectedRole[employee.user_id] || ''}
                                  onValueChange={(value) =>
                                    setSelectedRole((current) => ({ ...current, [employee.user_id!]: value as AppRole }))
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[150px]">
                                    <SelectValue placeholder="Add app role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles
                                      .filter((role) => !(userRolesByUserId[employee.user_id] ?? []).includes(role))
                                      .map((role) => (
                                        <SelectItem key={role} value={role}>
                                          <span className="capitalize">{role.replace('_', ' ')}</span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => employee.user_id && addRole(employee.user_id)}
                                  disabled={!selectedRole[employee.user_id] || addingRole?.userId === employee.user_id}
                                >
                                  {addingRole?.userId === employee.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <p>No linked user account</p>
                              <p className="text-xs">Invite app access and link this employee in one step.</p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => openInviteDialogForEmployee(employee)}
                              >
                                <Plus className="h-4 w-4" />
                                Invite User
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {employee.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDialog(employee)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(employee.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No employees found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <p className="text-sm text-muted-foreground mt-4">
                Showing {filteredEmployees.length} of {employees.length} results
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Workspace Access</h2>
                  <p className="text-sm text-muted-foreground">
                    Everyone with access in this workspace, including linked employee accounts.
                  </p>
                </div>
                <Button className="gap-2" onClick={openInviteDialog}>
                  <Plus className="h-4 w-4" />
                  Invite User
                </Button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-muted/30">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Linked Employee</th>
                      <th className="px-4 py-3 font-medium">Current Roles</th>
                      <th className="px-4 py-3 font-medium">Add Role</th>
                      <th className="px-4 py-3 font-medium">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {usersWithRoles.map((user) => {
                      const linkedEmployee = employees.find((employee) => employee.user_id === user.id) ?? null;
                      return (
                        <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {linkedEmployee ? (
                              <div>
                                <p className="font-medium">{linkedEmployee.first_name} {linkedEmployee.last_name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{linkedEmployee.category}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <span className="text-sm text-muted-foreground">No employee record</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => openDialogForUser(user)}
                                >
                                  <Plus className="h-4 w-4" />
                                  Create Employee
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length > 0 ? (
                                user.roles.map((role) => {
                                  const isProtectedOwnerAdmin =
                                    role === 'admin' &&
                                    PROTECTED_ADMIN_EMAILS.includes((user.email ?? '').toLowerCase());
                                  const canRemove = !isProtectedOwnerAdmin && (isAdmin || role !== 'admin');

                                  return (
                                    <Badge
                                      key={`${user.id}-${role}`}
                                      className={`${getRoleColor(role)} ${canRemove ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                                      onClick={() => canRemove && removeRole(user, role)}
                                      title={
                                        isProtectedOwnerAdmin
                                          ? 'This owner admin role is permanently protected'
                                          : !canRemove
                                            ? 'Only admins can remove admin role'
                                            : 'Click to remove role'
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
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Select
                                value={selectedRole[user.id] || ''}
                                onValueChange={(value) =>
                                  setSelectedRole((current) => ({ ...current, [user.id]: value as AppRole }))
                                }
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles
                                    .filter((role) => !user.roles.includes(role))
                                    .map((role) => (
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
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                        </tr>
                      );
                    })}
                    {usersWithRoles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No workspace users found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="mt-6">
          <Suspense fallback={dialogFallback}>
            <OvertimeNotificationSettings />
          </Suspense>
        </TabsContent>
      </Tabs>

      <Suspense fallback={dialogFallback}>
        <EmployeeEditorDialog
              categories={CATEGORIES}
              editingEmployee={editingEmployee}
              formData={formData}
              isOpen={isDialogOpen}
              isSaving={isSaving}
              profiles={availableProfilesForDialog}
              onClose={() => setIsDialogOpen(false)}
              onOpenChange={setIsDialogOpen}
              onSave={handleSave}
          onFormDataChange={setFormData}
        />
        <WorkspaceInviteDialog
          availableRoles={availableRoles}
          categories={CATEGORIES}
          form={workspaceInviteForm}
          isInvitingUser={isInvitingUser}
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          onInvite={handleInviteWorkspaceUser}
          onOpenChange={setIsInviteDialogOpen}
          onRoleCategorySync={getDefaultEmployeeCategoryForRole}
          onFormChange={setWorkspaceInviteForm}
        />
        <PreviewLinkDialog
          previewLink={previewLink}
          onCopy={copyPreviewLink}
          onClose={() => setPreviewLink(null)}
        />
      </Suspense>
    </div>
  );
}
