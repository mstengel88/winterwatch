import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, Plus, Loader2, Truck, Shovel, Search, Upload, MoreHorizontal, Pencil, Trash2, Clock } from 'lucide-react';
import { Employee, EmployeeCategory } from '@/types/database';
import { Profile } from '@/types/auth';
import { employeeSchema, getValidationError } from '@/lib/validations';
import { OvertimeNotificationSettings } from '@/components/admin/OvertimeNotificationSettings';

const CATEGORIES: EmployeeCategory[] = ['plow', 'shovel', 'both'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
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
    try {
      const [employeesRes, profilesRes] = await Promise.all([
        supabase.from('employees').select('*').order('last_name'),
        supabase.from('profiles').select('*'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setEmployees(employeesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSave = async () => {
    // Validate form data with zod schema
    const validationResult = employeeSchema.safeParse(formData);
    if (!validationResult.success) {
      toast.error(getValidationError(validationResult.error));
      return;
    }

    setIsSaving(true);
    try {
      const validated = validationResult.data;
      const employeeData = {
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email || null,
        phone: validated.phone || null,
        category: validated.category,
        hourly_rate: validated.hourly_rate ? parseFloat(validated.hourly_rate) : null,
        user_id: validated.user_id || null,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);
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
      toast.error('Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      toast.success('Employee deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      <th className="px-4 py-3 font-medium">Type</th>
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
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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

        <TabsContent value="users" className="mt-6">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>User & Role management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="mt-6">
          <OvertimeNotificationSettings />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Update employee information' : 'Create a new employee record'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as EmployeeCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200] max-h-[200px]">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="capitalize">{cat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link to User Account</Label>
              <Select
                value={formData.user_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, user_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user account (optional)" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200] max-h-[200px]">
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || profile.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEmployee ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}