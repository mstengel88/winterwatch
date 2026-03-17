import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type OvertimeAction = 'stay_on_shift' | 'stop_shift';

interface OvertimeActionResult {
  success: boolean;
  action?: OvertimeAction;
  message?: string;
  clock_out_time?: string;
  error?: string;
}

export function useOvertimeAction() {
  const { toast } = useToast();

  const handleOvertimeAction = useCallback(async (
    action: OvertimeAction,
    timeClockId: string,
    employeeId: string
  ): Promise<OvertimeActionResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('overtime-action', {
        body: {
          action,
          time_clock_id: timeClockId,
          employee_id: employeeId,
        },
      });

      if (error) {
        console.error('Error handling overtime action:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to process action',
        });
        return { success: false, error: error.message };
      }

      if (data.success) {
        if (action === 'stop_shift') {
          toast({
            title: 'Shift Ended',
            description: 'You have been clocked out successfully',
          });
        } else {
          toast({
            title: 'Continuing Shift',
            description: 'Stay safe and keep up the great work!',
          });
        }
      }

      return data as OvertimeActionResult;
    } catch (err) {
      console.error('Failed to handle overtime action:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process action',
      });
      return { success: false, error: 'Unknown error' };
    }
  }, [toast]);

  const stayOnShift = useCallback(
    (timeClockId: string, employeeId: string) => 
      handleOvertimeAction('stay_on_shift', timeClockId, employeeId),
    [handleOvertimeAction]
  );

  const stopShift = useCallback(
    (timeClockId: string, employeeId: string) => 
      handleOvertimeAction('stop_shift', timeClockId, employeeId),
    [handleOvertimeAction]
  );

  return {
    handleOvertimeAction,
    stayOnShift,
    stopShift,
  };
}
