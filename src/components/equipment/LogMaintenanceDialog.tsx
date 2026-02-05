import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Equipment } from '@/types/database';

const MAINTENANCE_TYPES = [
  'Oil Change',
  'Tire Rotation',
  'Brake Service',
  'Transmission Service',
  'Plow Blade Replacement',
  'Spreader Maintenance',
  'General Inspection',
  'Repair',
  'Other',
];

interface LogMaintenanceDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogMaintenanceDialog({ equipment, open, onOpenChange, onSuccess }: LogMaintenanceDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_type: 'General Inspection',
    description: '',
    cost: '',
    performed_by_name: '',
    next_service_date: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        maintenance_type: 'General Inspection',
        description: '',
        cost: '',
        performed_by_name: '',
        next_service_date: '',
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!equipment) return;

    setIsSaving(true);
    try {
      // Insert maintenance log
      const { error: logError } = await supabase.from('maintenance_logs').insert({
        equipment_id: equipment.id,
        maintenance_type: formData.maintenance_type,
        description: formData.description || null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        performed_by_name: formData.performed_by_name || null,
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
          <DialogTitle>Log Service</DialogTitle>
          <DialogDescription>
            Record maintenance for {equipment?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Service Type *</Label>
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the work performed..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performed_by">Performed By</Label>
              <Input
                id="performed_by"
                value={formData.performed_by_name}
                onChange={(e) => setFormData({ ...formData, performed_by_name: e.target.value })}
                placeholder="Name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_service">Next Service Date</Label>
            <Input
              id="next_service"
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
            Save Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
