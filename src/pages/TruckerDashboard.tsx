import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wrench, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Equipment {
  id: string;
  name: string;
  type: string;
  license_plate: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface MaintenanceRequest {
  id: string;
  problem_description: string;
  mileage: number | null;
  status: string;
  created_at: string;
  equipment: { name: string } | null;
}

const MAINTENANCE_TYPES = [
  'Inspection',
  'Oil Change',
  'Tire Rotation',
  'Brake Service',
  'Repair',
  'Preventive Maintenance',
  'Other',
];

export default function TruckerDashboard() {
  const { user } = useAuth();
  const { employee, isLoading: employeeLoading } = useEmployee();
  const { toast } = useToast();

  const [trucks, setTrucks] = useState<Equipment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTruck, setSelectedTruck] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [performedByEmployee, setPerformedByEmployee] = useState('');
  const [performedByName, setPerformedByName] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');

  useEffect(() => {
    fetchTrucks();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employee) fetchRequests();
  }, [employee]);

  const fetchTrucks = async () => {
    const { data } = await supabase
      .from('equipment')
      .select('id, name, type, license_plate')
      .eq('is_active', true)
      .order('name');
    setTrucks((data as Equipment[]) ?? []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name');
    setEmployees((data as Employee[]) ?? []);
  };

  const fetchRequests = async () => {
    if (!employee) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('maintenance_requests')
      .select('id, problem_description, mileage, status, created_at, equipment:equipment_id(name)')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setRequests((data as MaintenanceRequest[]) ?? []);
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedTruck('');
    setMaintenanceType('');
    setDescription('');
    setCost('');
    setPerformedByEmployee('');
    setPerformedByName('');
    setNextServiceDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) {
      toast({ title: 'Error', description: 'No employee record linked to your account.', variant: 'destructive' });
      return;
    }
    if (!selectedTruck || !maintenanceType || !description.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in Truck, Maintenance Type, and Description.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const selectedTruckData = trucks.find(t => t.id === selectedTruck);

    // Resolve performer name
    let resolvedPerformerName = performedByName.trim() || null;
    if (performedByEmployee) {
      const emp = employees.find(e => e.id === performedByEmployee);
      if (emp) resolvedPerformerName = `${emp.first_name} ${emp.last_name}`;
    }

    const { error } = await supabase
      .from('maintenance_logs')
      .insert({
        equipment_id: selectedTruck,
        maintenance_type: maintenanceType,
        description: description.trim(),
        cost: cost ? parseFloat(cost) : null,
        performed_by_employee_id: performedByEmployee || null,
        performed_by_name: resolvedPerformerName,
        service_date: new Date().toISOString(),
        next_service_date: nextServiceDate || null,
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to log maintenance.', variant: 'destructive' });
    } else {
      // Update equipment last_maintenance_date
      await supabase
        .from('equipment')
        .update({ last_maintenance_date: new Date().toISOString().split('T')[0] })
        .eq('id', selectedTruck);

      toast({ title: 'Logged', description: 'Maintenance logged successfully.' });

      // Notify admins (fire and forget)
      supabase.functions.invoke('notify-maintenance-request', {
        body: {
          equipment_name: selectedTruckData?.name || 'Unknown truck',
          problem_description: `${maintenanceType}: ${description.trim()}`,
          driver_name: `${employee.first_name} ${employee.last_name}`,
        },
      }).then(({ error: notifError }) => {
        if (notifError) console.error('Notification error:', notifError);
      });

      resetForm();
      fetchRequests();
    }
    setSubmitting(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedTruckName = trucks.find(t => t.id === selectedTruck)?.name;

  if (employeeLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trucker Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {employee ? `${employee.first_name} ${employee.last_name}` : 'Log maintenance for your truck'}
          </p>
        </div>

        {/* Log Maintenance Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Log Maintenance{selectedTruckName ? ` - ${selectedTruckName}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Truck Selection */}
              <div className="space-y-2">
                <Label>Truck *</Label>
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.license_plate ? ` (${t.license_plate})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Maintenance Type */}
              <div className="space-y-2">
                <Label>Maintenance Type *</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
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
                  placeholder="Details about maintenance performed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Cost */}
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>

              {/* Performed By */}
              <div className="space-y-2">
                <Label>Performed By</Label>
                <Select value={performedByEmployee} onValueChange={setPerformedByEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter name manually"
                  value={performedByName}
                  onChange={(e) => setPerformedByName(e.target.value)}
                />
              </div>

              {/* Next Service Date */}
              <div className="space-y-2">
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !employee}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
                  Log Maintenance
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Previous Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              My Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No maintenance requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="border border-border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{req.equipment?.name ?? 'Unknown truck'}</span>
                      <Badge variant="outline" className={statusColor(req.status)}>
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.problem_description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {req.mileage && <span>Mileage: {req.mileage.toLocaleString()}</span>}
                      <span>{format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
