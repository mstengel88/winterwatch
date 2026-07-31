import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AppRole } from '@/types/auth';
import { EmployeeCategory } from '@/types/database';

type WorkspaceInviteForm = {
  full_name: string;
  email: string;
  phone: string;
  role: AppRole;
  create_employee: boolean;
  employee_category: EmployeeCategory;
  employee_id: string;
};

interface WorkspaceInviteDialogProps {
  availableRoles: AppRole[];
  categories: EmployeeCategory[];
  form: WorkspaceInviteForm;
  isInvitingUser: boolean;
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
  onOpenChange: (open: boolean) => void;
  onRoleCategorySync: (role: AppRole) => EmployeeCategory;
  onFormChange: (next: WorkspaceInviteForm) => void;
}

export default function WorkspaceInviteDialog({
  availableRoles,
  categories,
  form,
  isInvitingUser,
  isOpen,
  onClose,
  onInvite,
  onOpenChange,
  onRoleCategorySync,
  onFormChange,
}: WorkspaceInviteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Workspace User</DialogTitle>
          <DialogDescription>
            Create app access for this organization and optionally make the linked employee record in the same step.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite_full_name">Full Name *</Label>
            <Input
              id="invite_full_name"
              value={form.full_name}
              onChange={(e) => onFormChange({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite_email">Email *</Label>
              <Input
                id="invite_email"
                type="email"
                value={form.email}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite_phone">Phone</Label>
              <Input
                id="invite_phone"
                value={form.phone}
                onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  onFormChange({
                    ...form,
                    role: value as AppRole,
                    employee_category: form.employee_id
                      ? form.employee_category
                      : onRoleCategorySync(value as AppRole),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200] max-h-[220px]">
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className="capitalize">{role.replace('_', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee Category</Label>
              <Select
                value={form.employee_category}
                onValueChange={(value) => onFormChange({ ...form, employee_category: value as EmployeeCategory })}
                disabled={!form.create_employee}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200] max-h-[220px]">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      <span className="capitalize">{category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.employee_id && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-muted-foreground">
              This invite will link to the existing employee record for <span className="font-medium text-foreground">{form.full_name}</span>.
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="invite_create_employee">Create linked employee</Label>
              <p className="text-sm text-muted-foreground">
                Turn this on when the user also needs to clock in, work accounts, or appear on crews.
              </p>
            </div>
            <Switch
              id="invite_create_employee"
              checked={form.create_employee}
              disabled={Boolean(form.employee_id)}
              onCheckedChange={(checked) => onFormChange({ ...form, create_employee: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onInvite} disabled={isInvitingUser}>
            {isInvitingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Invite User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
