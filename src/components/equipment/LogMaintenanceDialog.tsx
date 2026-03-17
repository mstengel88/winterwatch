import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Equipment } from '@/types/database';

const MAINTENANCE_TYPES = [
  'Inspection',
  'Oil Change',
  'Tire Rotation',
  'Brake Service',
  'Transmission Service',
  'Plow Blade Replacement',
  'Spreader Maintenance',
  'Repair',
  'Other',
];

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface LogMaintenanceDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogMaintenanceDialog({ equipment, open, onOpenChange, onSuccess }: LogMaintenanceDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    maintenance_type: 'Inspection',
    description: '',
    cost: '',
    performed_by_employee_id: '',
    performed_by_name: '',
    next_service_date: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        maintenance_type: 'Inspection',
        description: '',
        cost: '',
        performed_by_employee_id: '',
        performed_by_name: '',
        next_service_date: '',
      });
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name');
    setEmployees((data as Employee[]) ?? []);
  };

  const handleSave = async () => {
    if (!equipment) return;
    if (!formData.maintenance_type || !formData.description.trim()) {
      toast.error('Please fill in Maintenance Type and Description.');
      return;
    }

    setIsSaving(true);
    try {
      // Resolve performer name
      let resolvedName = formData.performed_by_name.trim() || null;
      if (formData.performed_by_employee_id) {
        const emp = employees.find(e => e.id === formData.performed_by_employee_id);
        if (emp) resolvedName = `${emp.first_name} ${emp.last_name}`;
      }

      const { error: logError } = await supabase.from('maintenance_logs').insert({
        equipment_id: equipment.id,
        maintenance_type: formData.maintenance_type,
        description: formData.description.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        performed_by_employee_id: formData.performed_by_employee_id || null,
        performed_by_name: resolvedName,
        next_service_date: formData.next_service_date || null,
      });

      if (logError) throw logError;

      // Update equipment's last maintenance date
      const updateData: any = {
        last_maintenance_date: new Date().toISOString().split('T')[0],
      };
      if (formData.next_service_date) {
        updateData.next_maintenance_date = formData.next_service_date;
      }

      const { error: updateError } = await supabase
        .from('equipment')
        .update(updateData)
        .eq('id', equipment.id);

      if (updateError) throw updateError;

      toast.success('Maintenance logged successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error logging maintenance:', error);
      toast.error('Failed to log maintenance');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Maintenance - {equipment?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label>Maintenance Type *</Label>
            <Select
              value={formData.maintenance_type}
              onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card z-[200]">
                {MAINTENANCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about maintenance performed..."
              rows={4}
            />
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label>Cost ($)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
            />
          </div>

          {/* Performed By */}
          <div className="space-y-2">
            <Label>Performed By</Label>
            <Select
              value={formData.performed_by_employee_id}
              onValueChange={(value) => setFormData({ ...formData, performed_by_employee_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent className="bg-card z-[200]">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={formData.performed_by_name}
              onChange={(e) => setFormData({ ...formData, performed_by_name: e.target.value })}
              placeholder="Or enter name manually"
            />
          </div>

          {/* Next Service Date */}
          <div className="space-y-2">
            <Label>Next Service Date</Label>
            <Input
              type="date"
              value={formData.next_service_date}
              onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Maintenance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}