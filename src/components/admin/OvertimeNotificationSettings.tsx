import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Bell, Loader2, Plus, Pencil, Trash2, Users } from 'lucide-react';

interface OvertimeSetting {
  id: string;
  employee_id: string | null;
  threshold_hours: number;
  is_enabled: boolean;
  notify_employee: boolean;
  notify_admins: boolean;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

const GLOBAL_SETTING_ID = '__GLOBAL__';

export function OvertimeNotificationSettings() {
  const [settings, setSettings] = useState<OvertimeSetting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<OvertimeSetting | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '', // Empty string for individual, GLOBAL_SETTING_ID for global
    threshold_hours: '8',
    is_enabled: true,
    notify_employee: true,
    notify_admins: true,
  });

  // Separate global settings from individual settings
  const globalSettings = settings.filter(s => s.employee_id === null);
  const individualSettings = settings.filter(s => s.employee_id !== null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, employeesRes] = await Promise.all([
        supabase.from('overtime_notification_settings').select('*'),
        supabase.from('employees').select('id, first_name, last_name, is_active').eq('is_active', true).order('last_name'),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setSettings(settingsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load overtime settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDialog = (setting?: OvertimeSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        employee_id: setting.employee_id === null ? GLOBAL_SETTING_ID : setting.employee_id,
        threshold_hours: setting.threshold_hours.toString(),
        is_enabled: setting.is_enabled,
        notify_employee: setting.notify_employee,
        notify_admins: setting.notify_admins,
      });
    } else {
      setEditingSetting(null);
      setFormData({
        employee_id: '',
        threshold_hours: '8',
        is_enabled: true,
        notify_employee: true,
        notify_admins: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // For individual settings, require an employee selection
    if (!formData.employee_id) {
      toast.error('Please select an employee or "All Employees (Global)"');
      return;
    }

    const thresholdHours = parseFloat(formData.threshold_hours);
    if (isNaN(thresholdHours) || thresholdHours <= 0) {
      toast.error('Please enter a valid threshold (hours)');
      return;
    }

    setIsSaving(true);
    try {
      const isGlobal = formData.employee_id === GLOBAL_SETTING_ID;
      const data = {
        employee_id: isGlobal ? null : formData.employee_id,
        threshold_hours: thresholdHours,
        is_enabled: formData.is_enabled,
        notify_employee: formData.notify_employee,
        notify_admins: formData.notify_admins,
      };

      if (editingSetting) {
        const { error } = await supabase
          .from('overtime_notification_settings')
          .update(data)
          .eq('id', editingSetting.id);
        if (error) throw error;
        toast.success('Setting updated');
      } else {
        const { error } = await supabase
          .from('overtime_notification_settings')
          .insert(data);
        if (error) {
          if (error.code === '23505') {
            toast.error(isGlobal 
              ? 'A global setting already exists' 
              : 'This employee already has an overtime setting');
            return;
          }
          throw error;
        }
        toast.success('Setting created');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    try {
      const { error } = await supabase
        .from('overtime_notification_settings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Setting deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error('Failed to delete setting');
    }
  };

  const handleToggleEnabled = async (setting: OvertimeSetting) => {
    try {
      const { error } = await supabase
        .from('overtime_notification_settings')
        .update({ is_enabled: !setting.is_enabled })
        .eq('id', setting.id);
      if (error) throw error;
      
      setSettings(prev => prev.map(s => 
        s.id === setting.id ? { ...s, is_enabled: !s.is_enabled } : s
      ));
      toast.success(setting.is_enabled ? 'Disabled' : 'Enabled');
    } catch (error) {
      console.error('Error toggling setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const getEmployeeName = (employeeId: string | null) => {
    if (employeeId === null) return 'All Employees (Global Default)';
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  };

  // Get employees without settings for the dropdown (exclude those with individual settings)
  const availableEmployees = employees.filter(
    emp => !individualSettings.some(s => s.employee_id === emp.id) || editingSetting?.employee_id === emp.id
  );

  // Global setting is always available (can have multiple)
  const canAddGlobal = true;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Overtime Notifications</CardTitle>
                <CardDescription>
                  Send alerts when employees have been clocked in for a specified time
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Setting
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No overtime notifications configured</p>
              <p className="text-sm">Add a setting to notify when employees work beyond a threshold</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Threshold</th>
                    <th className="px-4 py-3 font-medium">Notify</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {/* Show global settings first */}
                  {globalSettings.map((globalSetting) => (
                    <tr key={globalSetting.id} className="hover:bg-muted/20 transition-colors bg-primary/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-primary">
                              All Employees (Global)
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Applies to employees without individual settings
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {globalSetting.threshold_hours} hours
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {globalSetting.notify_employee && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Employee
                            </Badge>
                          )}
                          {globalSetting.notify_admins && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Admins
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={globalSetting.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(globalSetting)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDialog(globalSetting)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(globalSetting.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Individual employee settings */}
                  {individualSettings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">
                            {getEmployeeName(setting.employee_id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {setting.threshold_hours} hours
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {setting.notify_employee && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Employee
                            </Badge>
                          )}
                          {setting.notify_admins && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Admins
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={setting.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(setting)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDialog(setting)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(setting.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? 'Edit Overtime Setting' : 'Add Overtime Setting'}
            </DialogTitle>
            <DialogDescription>
              Configure when to send overtime notifications
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Apply To</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                disabled={!!editingSetting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee or global" />
                </SelectTrigger>
                <SelectContent>
                  {canAddGlobal && (
                    <SelectItem value={GLOBAL_SETTING_ID} className="font-medium">
                      <span className="text-primary">🌐 All Employees (Global Default)</span>
                    </SelectItem>
                  )}
                  {availableEmployees.length > 0 && canAddGlobal && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                      Individual Employees
                    </div>
                  )}
                  {availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Global applies to all employees without individual settings
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold_hours">Threshold (hours)</Label>
              <Input
                id="threshold_hours"
                type="number"
                step="0.5"
                min="0.5"
                value={formData.threshold_hours}
                onChange={(e) => setFormData({ ...formData, threshold_hours: e.target.value })}
                placeholder="e.g., 8"
              />
              <p className="text-xs text-muted-foreground">
                Notify when employee has been clocked in for this many hours
              </p>
            </div>
            <div className="space-y-4">
              <Label>Notification Recipients</Label>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify_employee" className="text-sm font-normal">
                    Notify Employee
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send notification to the employee
                  </p>
                </div>
                <Switch
                  id="notify_employee"
                  checked={formData.notify_employee}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_employee: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify_admins" className="text-sm font-normal">
                    Notify Admins/Managers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send notification to all admins and managers
                  </p>
                </div>
                <Switch
                  id="notify_admins"
                  checked={formData.notify_admins}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_admins: checked })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_enabled" className="text-sm font-normal">
                  Enabled
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn this notification on or off
                </p>
              </div>
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSetting ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
