import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Employee, TimeClockEntry } from '@/types/database';
import { useGeolocation } from './useGeolocation';
import { useLocationTracking } from './useLocationTracking';

interface UseEmployeeReturn {
  employee: Employee | null;
  activeShift: TimeClockEntry | null;
  isLoading: boolean;
  error: string | null;
  clockIn: () => Promise<boolean>;
  clockOut: () => Promise<boolean>;
  refreshEmployee: () => Promise<void>;
}

export function useEmployee(): UseEmployeeReturn {
  const { user, activeOrganizationId } = useAuth();
  const { getCurrentLocation } = useGeolocation();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeShift, setActiveShift] = useState<TimeClockEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send GPS pings while on shift
  useLocationTracking(employee?.id, activeShift?.id);

  const fetchEmployee = useCallback(async () => {
    if (!user) {
      setEmployee(null);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id);

      if (activeOrganizationId) {
        query = query.eq('organization_id', activeOrganizationId);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setEmployee(data as Employee | null);
      setError(null);
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to fetch employee data');
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, user]);

  const fetchActiveShift = useCallback(async () => {
    if (!employee) {
      setActiveShift(null);
      return;
    }

    try {
      let query = supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out_time', null);

      if (activeOrganizationId) {
        query = query.eq('organization_id', activeOrganizationId);
      }

      const { data, error: fetchError } = await query
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setActiveShift(data as TimeClockEntry | null);
    } catch (err) {
      console.error('Error fetching active shift:', err);
    }
  }, [activeOrganizationId, employee]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  const clockIn = async (): Promise<boolean> => {
    if (!employee) {
      setError('No employee record found');
      return false;
    }

    const organizationId = activeOrganizationId ?? employee.organization_id;
    if (!organizationId) {
      setError('No active organization selected');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { data, error: insertError } = await supabase
        .from('time_clock')
        .insert({
          organization_id: organizationId,
          employee_id: employee.id,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: location?.latitude ?? null,
          clock_in_longitude: location?.longitude ?? null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveShift(data as TimeClockEntry);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error clocking in:', err);
      setError('Failed to clock in');
      return false;
    }
  };

  const clockOut = async (): Promise<boolean> => {
    if (!activeShift) {
      setError('No active shift found');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { error: updateError } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: new Date().toISOString(),
          clock_out_latitude: location?.latitude ?? null,
          clock_out_longitude: location?.longitude ?? null,
        })
        .eq('id', activeShift.id);

      if (updateError) throw updateError;

      setActiveShift(null);
      return true;
    } catch (err) {
      console.error('Error clocking out:', err);
      setError('Failed to clock out');
      return false;
    }
  };

  const refreshEmployee = async () => {
    await fetchEmployee();
    await fetchActiveShift();
  };

  return {
    employee,
    activeShift,
    isLoading,
    error,
    clockIn,
    clockOut,
    refreshEmployee,
  };
}
