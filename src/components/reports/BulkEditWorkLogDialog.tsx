import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
}

interface Equipment {
  id: string;
  name: string;
}

export interface BulkEditFormData {
  account_id?: string;
  employee_ids?: string[];
  equipment_id?: string;
  service_type?: string;
  date?: string;
  check_in_time?: string;
  check_out_time?: string;
  snow_depth_inches?: number;
  salt_used_lbs?: number;
  ice_melt_used_lbs?: number;
  weather_conditions?: string;
  notes?: string;
  billing_status?: 'current' | 'billable' | 'completed';
}

interface BulkEditWorkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  employees: Employee[];
  equipment: Equipment[];
  selectedCount: number;
  onSave: (data: BulkEditFormData) => Promise<void>;
  isLoading?: boolean;
}

export function BulkEditWorkLogDialog({ 
  open, 
  onOpenChange, 
  accounts,
  employees,
  equipment,
  selectedCount,
  onSave,
  isLoading = false 
}: BulkEditWorkLogDialogProps) {
  // Field toggles - only apply changes for enabled fields
  const [updateAccount, setUpdateAccount] = useState(false);
  const [updateEmployees, setUpdateEmployees] = useState(false);
  const [updateEquipment, setUpdateEquipment] = useState(false);
  const [updateServiceType, setUpdateServiceType] = useState(false);
  const [updateDate, setUpdateDate] = useState(false);
  const [updateCheckInTime, setUpdateCheckInTime] = useState(false);
  const [updateCheckOutTime, setUpdateCheckOutTime] = useState(false);
  const [updateSnowDepth, setUpdateSnowDepth] = useState(false);
  const [updateSalt, setUpdateSalt] = useState(false);
  const [updateWeather, setUpdateWeather] = useState(false);
  const [updateNotes, setUpdateNotes] = useState(false);
  const [updateBillingStatus, setUpdateBillingStatus] = useState(false);

  // Field values
  const [accountId, setAccountId] = useState('');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [serviceType, setServiceType] = useState('plow');
  const [date, setDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [billingStatus, setBillingStatus] = useState<'current' | 'billable' | 'completed'>('current');
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  const resetForm = () => {
    setUpdateAccount(false);
    setUpdateEmployees(false);
    setUpdateEquipment(false);
    setUpdateServiceType(false);
    setUpdateDate(false);
    setUpdateCheckInTime(false);
    setUpdateCheckOutTime(false);
    setUpdateSnowDepth(false);
    setUpdateSalt(false);
    setUpdateWeather(false);
    setUpdateNotes(false);
    setUpdateBillingStatus(false);
    setAccountId('');
    setEmployeeIds([]);
    setEquipmentId('');
    setServiceType('plow');
    setDate('');
    setCheckInTime('');
    setCheckOutTime('');
    setSnowDepth('');
    setSaltUsed('');
    setWeather('');
    setNotes('');
    setBillingStatus('current');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: BulkEditFormData = {};
    
    if (updateAccount && accountId) data.account_id = accountId;
    if (updateEmployees && employeeIds.length > 0) data.employee_ids = employeeIds;
    if (updateEquipment) data.equipment_id = equipmentId || undefined;
    if (updateServiceType && serviceType) data.service_type = serviceType;
    if (updateDate && date) data.date = date;
    if (updateCheckInTime) data.check_in_time = checkInTime || undefined;
    if (updateCheckOutTime) data.check_out_time = checkOutTime || undefined;
    if (updateSnowDepth) data.snow_depth_inches = snowDepth ? parseFloat(snowDepth) : undefined;
    if (updateSalt) data.salt_used_lbs = saltUsed ? parseFloat(saltUsed) : undefined;
    if (updateWeather) data.weather_conditions = weather || undefined;
    if (updateNotes) data.notes = notes || undefined;
    if (updateBillingStatus) data.billing_status = billingStatus;
    
    await onSave(data);
    resetForm();
  };

  const toggleEmployee = (empId: string) => {
    setEmployeeIds(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const getSelectedEmployeeNames = () => {
    return employeeIds
      .map(id => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  const hasAnyUpdate = updateAccount || updateEmployees || updateEquipment || 
    updateServiceType || updateDate || updateCheckInTime || updateCheckOutTime ||
    updateSnowDepth || updateSalt || updateWeather || updateNotes || updateBillingStatus;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Work Log{selectedCount !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Toggle fields you want to update. Only enabled fields will be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Account/Location */}
            <div className="flex items-center gap-4">
              <Switch checked={updateAccount} onCheckedChange={setUpdateAccount} />
              <div className={cn("flex-1 space-y-2", !updateAccount && "opacity-50")}>
                <Label>Account/Location</Label>
                <Select 
                  value={accountId} 
                  onValueChange={setAccountId} 
                  disabled={!updateAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200] bg-popover max-h-[200px]">
                    {accounts
                      .filter((acc) => acc.id && acc.id.trim() !== '')
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employees */}
            <div className="flex items-center gap-4">
              <Switch checked={updateEmployees} onCheckedChange={setUpdateEmployees} />
              <div className={cn("flex-1 space-y-2", !updateEmployees && "opacity-50")}>
                <Label>Employee(s)</Label>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild disabled={!updateEmployees}>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between min-h-[40px] h-auto",
                        employeeIds.length === 0 && "text-muted-foreground"
                      )}
                      disabled={!updateEmployees}
                    >
                      <span className="truncate text-left flex-1">
                        {employeeIds.length === 0
                          ? "Select employees"
                          : getSelectedEmployeeNames()}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0 z-[200] bg-popover" align="start">
                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                      {employees
                        .filter((emp) => emp.id && emp.id.trim() !== '' && emp.is_active !== false)
                        .map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => toggleEmployee(emp.id)}
                          >
                            <Checkbox
                              checked={employeeIds.includes(emp.id)}
                              onCheckedChange={() => toggleEmployee(emp.id)}
                            />
                            <span className="text-sm">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>
                        ))}
                    </div>
                    {employeeIds.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => setEmployeeIds([])}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear all
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Service Type & Equipment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Switch checked={updateServiceType} onCheckedChange={setUpdateServiceType} />
                <div className={cn("flex-1 space-y-2", !updateServiceType && "opacity-50")}>
                  <Label>Service Type</Label>
                  <Select 
                    value={serviceType} 
                    onValueChange={setServiceType}
                    disabled={!updateServiceType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200] bg-popover">
                      <SelectItem value="plow">Plow</SelectItem>
                      <SelectItem value="salt">Salt</SelectItem>
                      <SelectItem value="both">Plow/Salt</SelectItem>
                      <SelectItem value="shovel">Shovel Walks</SelectItem>
                      <SelectItem value="ice_melt">Salt Walks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={updateEquipment} onCheckedChange={setUpdateEquipment} />
                <div className={cn("flex-1 space-y-2", !updateEquipment && "opacity-50")}>
                  <Label>Equipment</Label>
                  <Select 
                    value={equipmentId || 'none'} 
                    onValueChange={(v) => setEquipmentId(v === 'none' ? '' : v)}
                    disabled={!updateEquipment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200] bg-popover max-h-[200px]">
                      <SelectItem value="none">None</SelectItem>
                      {equipment
                        .filter((eq) => eq.id && eq.id.trim() !== '')
                        .map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date & Times */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={updateDate} onCheckedChange={setUpdateDate} />
                <div className={cn("flex-1 space-y-2", !updateDate && "opacity-50")}>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={!updateDate}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={updateCheckInTime} onCheckedChange={setUpdateCheckInTime} />
                <div className={cn("flex-1 space-y-2", !updateCheckInTime && "opacity-50")}>
                  <Label>Check In</Label>
                  <Input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    disabled={!updateCheckInTime}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={updateCheckOutTime} onCheckedChange={setUpdateCheckOutTime} />
                <div className={cn("flex-1 space-y-2", !updateCheckOutTime && "opacity-50")}>
                  <Label>Check Out</Label>
                  <Input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    disabled={!updateCheckOutTime}
                  />
                </div>
              </div>
            </div>

            {/* Snow & Salt */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Switch checked={updateSnowDepth} onCheckedChange={setUpdateSnowDepth} />
                <div className={cn("flex-1 space-y-2", !updateSnowDepth && "opacity-50")}>
                  <Label>Snow Depth (inches)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 3.5"
                    value={snowDepth}
                    onChange={(e) => setSnowDepth(e.target.value)}
                    disabled={!updateSnowDepth}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={updateSalt} onCheckedChange={setUpdateSalt} />
                <div className={cn("flex-1 space-y-2", !updateSalt && "opacity-50")}>
                  <Label>Salt/Ice Melt (lbs)</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="e.g., 50"
                    value={saltUsed}
                    onChange={(e) => setSaltUsed(e.target.value)}
                    disabled={!updateSalt}
                  />
                </div>
              </div>
            </div>

            {/* Weather */}
            <div className="flex items-center gap-4">
              <Switch checked={updateWeather} onCheckedChange={setUpdateWeather} />
              <div className={cn("flex-1 space-y-2", !updateWeather && "opacity-50")}>
                <Label>Weather Conditions</Label>
                <Input
                  placeholder="e.g., Light snow, 28°F"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  disabled={!updateWeather}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-center gap-4">
              <Switch checked={updateNotes} onCheckedChange={setUpdateNotes} />
              <div className={cn("flex-1 space-y-2", !updateNotes && "opacity-50")}>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={!updateNotes}
                />
              </div>
            </div>

            {/* Billing Status */}
            <div className="flex items-center gap-4">
              <Switch checked={updateBillingStatus} onCheckedChange={setUpdateBillingStatus} />
              <div className={cn("flex-1 space-y-2", !updateBillingStatus && "opacity-50")}>
                <Label>Billing Status</Label>
                <Select 
                  value={billingStatus} 
                  onValueChange={(v: 'current' | 'billable' | 'completed') => setBillingStatus(v)}
                  disabled={!updateBillingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200] bg-popover">
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="billable">Billable</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !hasAnyUpdate}
              className="min-h-[44px]"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {selectedCount} Log{selectedCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
