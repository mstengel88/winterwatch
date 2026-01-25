import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  icon: string;
}

interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeather(latitude: number | null, longitude: number | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (latitude === null || longitude === null) {
      console.log('[Weather] No coordinates available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[Weather] Fetching weather for ${latitude}, ${longitude}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('get-weather', {
        body: { latitude, longitude },
      });

      if (fnError) {
        console.error('[Weather] Function error:', fnError);
        setError(fnError.message);
        return;
      }

      if (data?.fallback || data?.error) {
        console.log('[Weather] API returned fallback/error:', data.error);
        setError(data.error || 'Weather unavailable');
        return;
      }

      console.log('[Weather] Got weather data:', data);
      setWeather(data);
    } catch (err) {
      console.error('[Weather] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Fetch weather when coordinates change
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      fetchWeather();
    }
  }, [latitude, longitude, fetchWeather]);

  return {
    weather,
    isLoading,
    error,
    refetch: fetchWeather,
  };
}
