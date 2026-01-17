import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmployee } from './useEmployee';
import { useGeolocation } from './useGeolocation';
import { ShovelWorkLog, Account, ServiceType } from '@/types/database';

interface UseShovelWorkLogsReturn {
  accounts: Account[];
  activeWorkLog: ShovelWorkLog | null;
  recentWorkLogs: ShovelWorkLog[];
  isLoading: boolean;
  error: string | null;
  checkIn: (accountId: string, serviceType?: ServiceType, teamMemberIds?: string[]) => Promise<boolean>;
  checkOut: (data: CheckOutData) => Promise<boolean>;
  updateActiveWorkLog: (data: UpdateWorkLogData) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

interface CheckOutData {
  areasCleared?: string[];
  iceMeltUsedLbs?: number;
  snowDepthInches?: number;
  weatherConditions?: string;
  notes?: string;
  photoUrls?: string[];
}

interface UpdateWorkLogData {
  teamMemberIds?: string[];
  serviceType?: ServiceType;
}

export function useShovelWorkLogs(): UseShovelWorkLogsReturn {
  const { employee } = useEmployee();
  const { getCurrentLocation } = useGeolocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeWorkLog, setActiveWorkLog] = useState<ShovelWorkLog | null>(null);
  const [recentWorkLogs, setRecentWorkLogs] = useState<ShovelWorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .in('service_type', ['shovel', 'both'])
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
    if (!employee) {
      setActiveWorkLog(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('shovel_work_logs')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('employee_id', employee.id)
        .eq('status', 'in_progress')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setActiveWorkLog(data as ShovelWorkLog | null);
    } catch (err) {
      console.error('Error fetching active shovel work log:', err);
    }
  }, [employee]);

  const fetchRecentWorkLogs = useCallback(async () => {
    if (!employee) {
      setRecentWorkLogs([]);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from('shovel_work_logs')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('employee_id', employee.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setRecentWorkLogs((data || []) as ShovelWorkLog[]);
    } catch (err) {
      console.error('Error fetching recent shovel work logs:', err);
    }
  }, [employee]);

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
    serviceType: ServiceType = 'shovel',
    teamMemberIds?: string[]
  ): Promise<boolean> => {
    if (!employee) {
      setError('No employee record found');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { data, error: insertError } = await supabase
        .from('shovel_work_logs')
        .insert({
          account_id: accountId,
          employee_id: employee.id,
          service_type: serviceType,
          status: 'in_progress',
          check_in_time: new Date().toISOString(),
          check_in_latitude: location?.latitude ?? null,
          check_in_longitude: location?.longitude ?? null,
          team_member_ids: teamMemberIds && teamMemberIds.length > 0 ? teamMemberIds : null,
        })
        .select(`
          *,
          account:accounts(*)
        `)
        .single();

      if (insertError) throw insertError;

      setActiveWorkLog(data as ShovelWorkLog);
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
        .from('shovel_work_logs')
        .update({
          status: 'completed',
          check_out_time: new Date().toISOString(),
          check_out_latitude: location?.latitude ?? null,
          check_out_longitude: location?.longitude ?? null,
          areas_cleared: data.areasCleared ?? null,
          ice_melt_used_lbs: data.iceMeltUsedLbs ?? null,
          snow_depth_inches: data.snowDepthInches ?? null,
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

  const updateActiveWorkLog = async (data: UpdateWorkLogData): Promise<boolean> => {
    if (!activeWorkLog) {
      setError('No active work log found');
      return false;
    }

    try {
      const updatePayload: Record<string, unknown> = {};
      
      if (data.teamMemberIds !== undefined) {
        updatePayload.team_member_ids = data.teamMemberIds.length > 0 ? data.teamMemberIds : null;
      }
      if (data.serviceType !== undefined) {
        updatePayload.service_type = data.serviceType;
      }

      const { data: updatedData, error: updateError } = await supabase
        .from('shovel_work_logs')
        .update(updatePayload)
        .eq('id', activeWorkLog.id)
        .select(`
          *,
          account:accounts(*)
        `)
        .single();

      if (updateError) throw updateError;

      setActiveWorkLog(updatedData as ShovelWorkLog);
      return true;
    } catch (err) {
      console.error('Error updating work log:', err);
      setError('Failed to update work log');
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
    updateActiveWorkLog,
    refreshData,
  };
}