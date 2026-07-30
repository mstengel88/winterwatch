import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Employee, EmployeeCategory } from '@/types/database';
import { Profile } from '@/types/auth';

type EmployeeFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  category: EmployeeCategory;
  hourly_rate: string;
  user_id: string;
  is_active: boolean;
};

interface EmployeeEditorDialogProps {
  categories: EmployeeCategory[];
  editingEmployee: Employee | null;
  formData: EmployeeFormState;
  isOpen: boolean;
  isSaving: boolean;
  profiles: Profile[];
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onFormDataChange: (next: EmployeeFormState) => void;
}

export default function EmployeeEditorDialog({
  categories,
  editingEmployee,
  formData,
  isOpen,
  isSaving,
  profiles,
  onClose,
  onOpenChange,
  onSave,
  onFormDataChange,
}: EmployeeEditorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                onChange={(e) => onFormDataChange({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => onFormDataChange({ ...formData, last_name: e.target.value })}
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
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => onFormDataChange({ ...formData, category: value as EmployeeCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200] max-h-[200px]">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      <span className="capitalize">{category}</span>
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
                onChange={(e) => onFormDataChange({ ...formData, hourly_rate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link to User Account</Label>
            <Select
              value={formData.user_id || 'none'}
              onValueChange={(value) => onFormDataChange({ ...formData, user_id: value === 'none' ? '' : value })}
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
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive employees won't appear in work log selections
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, is_active: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingEmployee ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
