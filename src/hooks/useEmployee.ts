import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Employee, TimeClockEntry } from '@/types/database';
import { useGeolocation } from './useGeolocation';

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
  const { user } = useAuth();
  const { getCurrentLocation } = useGeolocation();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeShift, setActiveShift] = useState<TimeClockEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = async () => {
    if (!user) {
      setEmployee(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setEmployee(data as Employee | null);
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to fetch employee data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveShift = async () => {
    if (!employee) {
      setActiveShift(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setActiveShift(data as TimeClockEntry | null);
    } catch (err) {
      console.error('Error fetching active shift:', err);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [user]);

  useEffect(() => {
    fetchActiveShift();
  }, [employee]);

  const clockIn = async (): Promise<boolean> => {
    if (!employee) {
      setError('No employee record found');
      return false;
    }

    const location = await getCurrentLocation();

    try {
      const { data, error: insertError } = await supabase
        .from('time_clock')
        .insert({
          employee_id: employee.id,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: location?.latitude ?? null,
          clock_in_longitude: location?.longitude ?? null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveShift(data as TimeClockEntry);
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