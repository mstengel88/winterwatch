import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface ShiftData {
  id?: string;
  employee_id: string;
  clock_in_date: string;
  clock_in_time: string;
  clock_out_time: string;
}

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  initialData?: {
    id: string;
    employee_id: string;
    clock_in_time: string;
    clock_out_time: string | null;
  } | null;
  onSave: (data: ShiftData) => Promise<void>;
  isLoading?: boolean;
}

export function ShiftDialog({ 
  open, 
  onOpenChange, 
  employees, 
  initialData, 
  onSave,
  isLoading = false 
}: ShiftDialogProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [clockInDate, setClockInDate] = useState('');
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.employee_id);
      const inDate = new Date(initialData.clock_in_time);
      setClockInDate(inDate.toISOString().split('T')[0]);
      setClockInTime(inDate.toTimeString().slice(0, 5));
      if (initialData.clock_out_time) {
        const outDate = new Date(initialData.clock_out_time);
        setClockOutTime(outDate.toTimeString().slice(0, 5));
      } else {
        setClockOutTime('');
      }
    } else {
      setEmployeeId('');
      setClockInDate(new Date().toISOString().split('T')[0]);
      setClockInTime('');
      setClockOutTime('');
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: initialData?.id,
      employee_id: employeeId,
      clock_in_date: clockInDate,
      clock_in_time: clockInTime,
      clock_out_time: clockOutTime,
    });
  };

  const isEdit = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp) => emp.id && emp.id.trim() !== '')
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={clockInDate}
                onChange={(e) => setClockInDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clock In Time</Label>
                <Input
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Out Time</Label>
                <Input
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !employeeId || !clockInDate || !clockInTime}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
