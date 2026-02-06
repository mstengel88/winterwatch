import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Equipment } from '@/types/database';
import { format } from 'date-fns';

interface MaintenanceLog {
  id: string;
  maintenance_type: string;
  description: string | null;
  cost: number | null;
  performed_by_name: string | null;
  service_date: string;
  next_service_date: string | null;
}

interface MaintenanceHistoryDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function MaintenanceHistoryDialog({ equipment, open, onOpenChange, onUpdate }: MaintenanceHistoryDialogProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    if (!equipment) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('equipment_id', equipment.id)
        .order('service_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
      toast.error('Failed to load maintenance history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && equipment) {
      fetchLogs();
    }
  }, [open, equipment]);

  const handleDelete = async (logId: string) => {
    if (!confirm('Delete this maintenance log?')) return;

    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      toast.success('Log deleted');
      fetchLogs();
      onUpdate();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete log');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Maintenance History</DialogTitle>
          <DialogDescription>
            Service records for {equipment?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No maintenance records found
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-muted/50">
                          {log.maintenance_type}
                        </Badge>
                        {log.cost && log.cost > 0 && (
                          <span className="text-sm font-medium text-green-400">
                            ${log.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(log.service_date), 'MMM d, yyyy')}</span>
                        {log.performed_by_name && (
                          <span>by {log.performed_by_name}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
