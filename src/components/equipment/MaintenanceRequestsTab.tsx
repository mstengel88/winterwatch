import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  equipment_id: string;
  employee_id: string | null;
  problem_description: string;
  mileage: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  equipment?: { name: string; type: string };
  employee?: { first_name: string; last_name: string };
}

export function MaintenanceRequestsTab() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, equipment:equipment_id(name, type), employee:employee_id(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;

      // When completed, auto-create a maintenance_logs entry for the equipment
      if (status === 'completed') {
        const req = requests.find(r => r.id === id);
        if (req) {
          const driverName = req.employee
            ? `${req.employee.first_name} ${req.employee.last_name}`
            : null;

          const { error: logError } = await supabase
            .from('maintenance_logs')
            .insert({
              equipment_id: req.equipment_id,
              maintenance_type: 'Repair',
              description: req.problem_description,
              performed_by_name: driverName,
              performed_by_employee_id: req.employee_id || null,
              service_date: new Date().toISOString(),
            });

          if (logError) {
            console.error('Error creating maintenance log:', logError);
            toast.error('Request completed but failed to log to equipment history');
          }

          // Update equipment last_maintenance_date
          await supabase
            .from('equipment')
            .update({ last_maintenance_date: new Date().toISOString().split('T')[0] })
            .eq('id', req.equipment_id);
        }
      }

      toast.success(`Request marked as ${status.replace('_', ' ')}`);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateAdminNotes = async (id: string, admin_notes: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ admin_notes })
        .eq('id', id);
      if (error) throw error;
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1 text-orange-400 border-orange-400/30"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="gap-1 text-blue-400 border-blue-400/30"><Wrench className="h-3 w-3" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="gap-1 text-green-400 border-green-400/30"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No maintenance requests submitted yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {requests.length} maintenance request{requests.length !== 1 ? 's' : ''}
      </p>
      <Card className="bg-card/50 border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Truck</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Mileage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {format(new Date(req.created_at), 'MM/dd/yy h:mm a')}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {req.employee
                    ? `${req.employee.first_name} ${req.employee.last_name}`
                    : '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {req.equipment?.name || '—'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {req.problem_description}
                </TableCell>
                <TableCell>
                  {req.mileage != null ? req.mileage.toLocaleString() : '—'}
                </TableCell>
                <TableCell>{getStatusBadge(req.status)}</TableCell>
                <TableCell className="min-w-[180px]">
                  <Textarea
                    defaultValue={req.admin_notes || ''}
                    placeholder="Add notes..."
                    className="text-xs h-16 bg-muted/30 border-border/50"
                    onBlur={(e) => {
                      if (e.target.value !== (req.admin_notes || '')) {
                        updateAdminNotes(req.id, e.target.value);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={req.status}
                    onValueChange={(val) => updateStatus(req.id, val)}
                    disabled={updatingId === req.id}
                  >
                    <SelectTrigger className="w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
