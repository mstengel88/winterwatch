import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmployee } from './useEmployee';
import { useGeolocation } from './useGeolocation';
import { WorkLog, Account, ServiceType } from '@/types/database';

interface UseWorkLogsReturn {
  accounts: Account[];
  activeWorkLog: WorkLog | null;
  recentWorkLogs: WorkLog[];
  isLoading: boolean;
  error: string | null;
  checkIn: (accountId: string, equipmentId?: string, serviceType?: ServiceType, employeeId?: string) => Promise<boolean>;
  checkOut: (data: CheckOutData) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

interface CheckOutData {
  snowDepthInches?: number;
  saltUsedLbs?: number;
  weatherConditions?: string;
  notes?: string;
  photoUrls?: string[];
}

export function useWorkLogs(options?: { employeeId?: string | null }): UseWorkLogsReturn {
  const { employee } = useEmployee();
  const { getCurrentLocation } = useGeolocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeWorkLog, setActiveWorkLog] = useState<WorkLog | null>(null);
  const [recentWorkLogs, setRecentWorkLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveEmployeeId = options?.employeeId ?? employee?.id;

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAccounts((data || []) as Account[]);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
    }
  }, []);

  const fetchActiveWorkLog = useCallback(async () => {
    if (!effectiveEmployeeId) {
      setActiveWorkLog(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('work_logs')
        .select(`
          *,
          account:accounts(*),
          equipment:equipment(*)
        `)
        .eq('employee_id', effectiveEmployeeId)
        .eq('status', 'in_progress')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setActiveWorkLog(data as WorkLog | null);
    } catch (err) {
      console.error('Error fetching active work log:', err);
    }
  }, [effectiveEmployeeId]);

  const fetchRecentWorkLogs = useCallback(async () => {
    if (!effectiveEmployeeId) {
      setRecentWorkLogs([]);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from('work_logs')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('employee_id', effectiveEmployeeId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setRecentWorkLogs((data || []) as WorkLog[]);
    } catch (err) {
      console.error('Error fetching recent work logs:', err);
    }
  }, [effectiveEmployeeId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAccounts();
      await fetchActiveWorkLog();
      await fetchRecentWorkLogs();
      setIsLoading(false);
    };

    loadData();
  }, [fetchAccounts, fetchActiveWorkLog, fetchRecentWorkLogs]);

  const checkIn = async (
    accountId: string,
    equipmentId?: string,
    serviceType: ServiceType = 'both',
    employeeId?: string
  ): Promise<boolean> => {
    const effectiveEmployeeId = employeeId || options?.employeeId || employee?.id;
    if (!effectiveEmployeeId) {
      setError('No employee selected');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { data, error: insertError } = await supabase
        .from('work_logs')
        .insert({
          account_id: accountId,
          employee_id: effectiveEmployeeId,
          equipment_id: equipmentId || null,
          service_type: serviceType,
          status: 'in_progress',
          check_in_time: new Date().toISOString(),
          check_in_latitude: location?.latitude ?? null,
          check_in_longitude: location?.longitude ?? null,
        })
        .select(`
          *,
          account:accounts(*),
          equipment:equipment(*)
        `)
        .single();

      if (insertError) throw insertError;

      setActiveWorkLog(data as WorkLog);
      await fetchRecentWorkLogs();
      return true;
    } catch (err) {
      console.error('Error checking in:', err);
      setError('Failed to check in');
      return false;
    }
  };

  const checkOut = async (data: CheckOutData): Promise<boolean> => {
    if (!activeWorkLog) {
      setError('No active work log found');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { error: updateError } = await supabase
        .from('work_logs')
        .update({
          status: 'completed',
          check_out_time: new Date().toISOString(),
          check_out_latitude: location?.latitude ?? null,
          check_out_longitude: location?.longitude ?? null,
          snow_depth_inches: data.snowDepthInches ?? null,
          salt_used_lbs: data.saltUsedLbs ?? null,
          weather_conditions: data.weatherConditions ?? null,
          notes: data.notes ?? null,
          photo_urls: data.photoUrls ?? null,
        })
        .eq('id', activeWorkLog.id);

      if (updateError) throw updateError;

      setActiveWorkLog(null);
      await fetchRecentWorkLogs();
      return true;
    } catch (err) {
      console.error('Error checking out:', err);
      setError('Failed to check out');
      return false;
    }
  };

  const refreshData = async () => {
    await fetchAccounts();
    await fetchActiveWorkLog();
    await fetchRecentWorkLogs();
  };

  return {
    accounts,
    activeWorkLog,
    recentWorkLogs,
    isLoading,
    error,
    checkIn,
    checkOut,
    refreshData,
  };
}