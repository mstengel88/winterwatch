import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveShift {
  id: string;
  employee_id: string;
  clock_in_time: string;
  employee: { first_name: string; last_name: string } | null;
}

export function ActiveShiftsFeed() {
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveShifts = async () => {
    const { data } = await supabase
      .from('time_clock')
      .select('id, employee_id, clock_in_time, employee:employees(first_name, last_name)')
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false });

    setShifts((data as unknown as ActiveShift[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveShifts();

    // Subscribe to real-time changes on time_clock
    const channel = supabase
      .channel('active-shifts-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_clock' },
        () => {
          fetchActiveShifts();
        }
      )
      .subscribe();

    // Refresh elapsed times every 60s
    const timer = setInterval(() => {
      setShifts((prev) => [...prev]); // trigger re-render for time display
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          Active Shifts
          {shifts.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {shifts.length} on shift
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No active shifts right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const name = shift.employee
                ? `${shift.employee.first_name} ${shift.employee.last_name}`
                : 'Unknown';
              const elapsed = formatDistanceToNow(new Date(shift.clock_in_time), {
                addSuffix: false,
              });

              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{elapsed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
