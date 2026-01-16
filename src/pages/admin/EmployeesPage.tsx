import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Plus, Pencil, Trash2, Loader2, Truck, Shovel, Link } from 'lucide-react';
import { Employee, EmployeeCategory } from '@/types/database';
import { Profile } from '@/types/auth';

const CATEGORIES: EmployeeCategory[] = ['plow', 'shovel', 'both'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    category: 'both' as EmployeeCategory,
    hourly_rate: '',
    user_id: '',
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
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error('First and last name are required');
      return;
    }

    setIsSaving(true);
    try {
      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        category: formData.category,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        user_id: formData.user_id || null,
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

  const getCategoryBadge = (category: EmployeeCategory) => {
    switch (category) {
      case 'plow':
        return <Badge className="bg-plow text-plow-foreground"><Truck className="mr-1 h-3 w-3" />Plow</Badge>;
      case 'shovel':
        return <Badge className="bg-shovel text-shovel-foreground"><Shovel className="mr-1 h-3 w-3" />Shovel</Badge>;
      case 'both':
        return (
          <div className="flex gap-1">
            <Badge className="bg-plow text-plow-foreground"><Truck className="h-3 w-3" /></Badge>
            <Badge className="bg-shovel text-shovel-foreground"><Shovel className="h-3 w-3" /></Badge>
          </div>
        );
    }
  };

  const getLinkedProfile = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p) => p.id === userId);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and link to user accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
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
                    <SelectContent>
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
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Employees
          </CardTitle>
          <CardDescription>
            {employees.length} employee{employees.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked Account</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const linkedProfile = getLinkedProfile(employee.user_id);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.email && <div>{employee.email}</div>}
                          {employee.phone && <div className="text-muted-foreground">{employee.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(employee.category)}</TableCell>
                      <TableCell>
                        {linkedProfile ? (
                          <Badge variant="outline" className="gap-1">
                            <Link className="h-3 w-3" />
                            {linkedProfile.full_name || linkedProfile.email}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.hourly_rate ? `$${employee.hourly_rate}/hr` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openDialog(employee)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(employee.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No employees yet. Click "Add Employee" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
