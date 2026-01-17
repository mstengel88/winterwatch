import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Account {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Equipment {
  id: string;
  name: string;
}

export interface WorkLogFormData {
  id?: string;
  type: 'plow' | 'shovel';
  account_id: string;
  employee_id: string;
  equipment_id?: string;
  service_type: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  snow_depth_inches?: number;
  salt_used_lbs?: number;
  ice_melt_used_lbs?: number;
  weather_conditions?: string;
  notes?: string;
}

interface WorkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  employees: Employee[];
  equipment: Equipment[];
  initialData?: {
    id: string;
    type: 'plow' | 'shovel';
    account_id: string;
    employee_id: string;
    equipment_id?: string;
    service_type: string;
    check_in_time: string | null;
    check_out_time: string | null;
    snow_depth_inches: number | null;
    salt_used_lbs: number | null;
    ice_melt_used_lbs: number | null;
    weather_conditions: string | null;
    notes: string | null;
  } | null;
  onSave: (data: WorkLogFormData) => Promise<void>;
  isLoading?: boolean;
}

export function WorkLogDialog({ 
  open, 
  onOpenChange, 
  accounts,
  employees,
  equipment,
  initialData, 
  onSave,
  isLoading = false 
}: WorkLogDialogProps) {
  const [type, setType] = useState<'plow' | 'shovel'>('plow');
  const [accountId, setAccountId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [serviceType, setServiceType] = useState('plow');
  const [date, setDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [iceMeltUsed, setIceMeltUsed] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAccountId(initialData.account_id);
      setEmployeeId(initialData.employee_id);
      setEquipmentId(initialData.equipment_id || '');
      setServiceType(initialData.service_type);
      if (initialData.check_in_time) {
        const inDate = new Date(initialData.check_in_time);
        setDate(inDate.toISOString().split('T')[0]);
        setCheckInTime(inDate.toTimeString().slice(0, 5));
      }
      if (initialData.check_out_time) {
        const outDate = new Date(initialData.check_out_time);
        setCheckOutTime(outDate.toTimeString().slice(0, 5));
      }
      setSnowDepth(initialData.snow_depth_inches?.toString() || '');
      setSaltUsed(initialData.salt_used_lbs?.toString() || '');
      setIceMeltUsed(initialData.ice_melt_used_lbs?.toString() || '');
      setWeather(initialData.weather_conditions || '');
      setNotes(initialData.notes || '');
    } else {
      setType('plow');
      setAccountId('');
      setEmployeeId('');
      setEquipmentId('');
      setServiceType('plow');
      setDate(new Date().toISOString().split('T')[0]);
      setCheckInTime('');
      setCheckOutTime('');
      setSnowDepth('');
      setSaltUsed('');
      setIceMeltUsed('');
      setWeather('');
      setNotes('');
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: initialData?.id,
      type,
      account_id: accountId,
      employee_id: employeeId,
      equipment_id: equipmentId || undefined,
      service_type: serviceType,
      date,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      snow_depth_inches: snowDepth ? parseFloat(snowDepth) : undefined,
      salt_used_lbs: saltUsed ? parseFloat(saltUsed) : undefined,
      ice_melt_used_lbs: iceMeltUsed ? parseFloat(iceMeltUsed) : undefined,
      weather_conditions: weather || undefined,
      notes: notes || undefined,
    });
  };

  const isEdit = !!initialData;
  
  // Service type options based on log type
  const serviceTypeOptions = type === 'plow' 
    ? [
        { value: 'plow', label: 'Plow' },
        { value: 'salt', label: 'Salt' },
        { value: 'both', label: 'Plow/Salt' },
      ]
    : [
        { value: 'shovel', label: 'Shovel Walks' },
        { value: 'ice_melt', label: 'Salt Walks' },
        { value: 'both', label: 'Shovel/Salt Walks' },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Work Log' : 'Add New Work Log'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Log Type */}
            <div className="space-y-2">
              <Label>Log Type</Label>
              <Select value={type} onValueChange={(v: 'plow' | 'shovel') => {
                setType(v);
                setServiceType(v === 'plow' ? 'plow' : 'shovel');
              }} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plow">Plow (Driver)</SelectItem>
                  <SelectItem value="shovel">Shovel (Crew)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account & Employee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account/Location</Label>
                <Select value={accountId} onValueChange={setAccountId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((acc) => acc.id && acc.id.trim() !== '')
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            {/* Service Type & Equipment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === 'plow' && (
                <div className="space-y-2">
                  <Label>Equipment</Label>
                  <Select value={equipmentId} onValueChange={(v) => setEquipmentId(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {equipment
                        .filter((eq) => eq.id && eq.id.trim() !== '')
                        .map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Date & Times */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Check In</Label>
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check Out</Label>
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </div>
            </div>

            {/* Snow & Salt */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Snow Depth (inches)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 3.5"
                  value={snowDepth}
                  onChange={(e) => setSnowDepth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{type === 'plow' ? 'Salt Used (lbs)' : 'Ice Melt (lbs)'}</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="e.g., 50"
                  value={type === 'plow' ? saltUsed : iceMeltUsed}
                  onChange={(e) => type === 'plow' ? setSaltUsed(e.target.value) : setIceMeltUsed(e.target.value)}
                />
              </div>
            </div>

            {/* Weather */}
            <div className="space-y-2">
              <Label>Weather Conditions</Label>
              <Input
                placeholder="e.g., Light snow, 28°F"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !accountId || !employeeId}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
