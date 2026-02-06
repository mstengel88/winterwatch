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

interface MaintenanceRequest {
  id: string;
  problem_description: string;
  mileage: number | null;
  status: string;
  created_at: string;
  equipment: { name: string } | null;
}

export default function TruckerDashboard() {
  const { user } = useAuth();
  const { employee, isLoading: employeeLoading } = useEmployee();
  const { toast } = useToast();

  const [trucks, setTrucks] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTruck, setSelectedTruck] = useState('');
  const [problem, setProblem] = useState('');
  const [mileage, setMileage] = useState('');

  useEffect(() => {
    fetchTrucks();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) {
      toast({ title: 'Error', description: 'No employee record linked to your account.', variant: 'destructive' });
      return;
    }
    if (!selectedTruck || !problem.trim()) {
      toast({ title: 'Missing fields', description: 'Please select a truck and describe the problem.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase as any)
      .from('maintenance_requests')
      .insert({
        employee_id: employee.id,
        equipment_id: selectedTruck,
        problem_description: problem.trim(),
        mileage: mileage ? parseFloat(mileage) : null,
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit request.', variant: 'destructive' });
    } else {
      toast({ title: 'Submitted', description: 'Maintenance request submitted successfully.' });
      setSelectedTruck('');
      setProblem('');
      setMileage('');
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
            {employee ? `${employee.first_name} ${employee.last_name}` : 'Submit maintenance requests for your truck'}
          </p>
        </div>

        {/* Maintenance Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Maintenance Request
            </CardTitle>
            <CardDescription>Report a truck issue that needs attention</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  value={employee ? `${employee.first_name} ${employee.last_name}` : 'No employee record found'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="truck">Truck Number *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  type="text"
                  inputMode="decimal"
                  placeholder="Current mileage"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem">Problem Description *</Label>
                <Textarea
                  id="problem"
                  placeholder="Describe the issue in detail..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !employee}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
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
