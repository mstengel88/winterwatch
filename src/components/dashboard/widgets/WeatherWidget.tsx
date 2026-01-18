import { Card, CardContent } from '@/components/ui/card';
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Sun, 
  CloudSun, 
  Wind,
  Thermometer,
  Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  temperature: string;
  conditions: string;
  windSpeed: string;
  humidity?: string;
  variant?: 'driver' | 'shovel';
  className?: string;
  compact?: boolean;
}

function getWeatherIcon(conditions: string) {
  const lowerConditions = conditions.toLowerCase();
  
  if (lowerConditions.includes('snow') || lowerConditions.includes('flurr')) {
    return CloudSnow;
  }
  if (lowerConditions.includes('rain') || lowerConditions.includes('drizzle')) {
    return CloudRain;
  }
  if (lowerConditions.includes('clear') || lowerConditions.includes('sunny')) {
    return Sun;
  }
  if (lowerConditions.includes('partly') || lowerConditions.includes('partial')) {
    return CloudSun;
  }
  return Cloud;
}

function getTemperatureColor(temp: number) {
  if (temp <= 20) return 'text-blue-400';
  if (temp <= 32) return 'text-cyan-400';
  if (temp <= 50) return 'text-yellow-400';
  return 'text-orange-400';
}

export function WeatherWidget({
  temperature,
  conditions,
  windSpeed,
  humidity,
  variant = 'driver',
  className,
  compact = false,
}: WeatherWidgetProps) {
  const WeatherIcon = getWeatherIcon(conditions);
  const tempValue = parseInt(temperature) || 32;
  const tempColor = getTemperatureColor(tempValue);
  const accentBg = variant === 'driver' ? 'bg-primary/10' : 'bg-purple-500/10';
  const accentBorder = variant === 'driver' ? 'border-primary/20' : 'border-purple-500/20';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border/50', className)}>
        <WeatherIcon className="h-4 w-4 text-muted-foreground" />
        <span className={cn('font-bold', tempColor)}>{temperature}°F</span>
        <span className="text-xs text-muted-foreground">{conditions}</span>
      </div>
    );
  }

  return (
    <Card className={cn('border-border/50 overflow-hidden', accentBorder, className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Weather Icon */}
          <div className={cn('h-16 w-16 rounded-xl flex items-center justify-center', accentBg)}>
            <WeatherIcon className={cn('h-8 w-8', tempColor)} />
          </div>
          
          {/* Temperature & Conditions */}
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className={cn('text-3xl font-bold', tempColor)}>
                {temperature}
              </span>
              <span className="text-lg text-muted-foreground">°F</span>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{conditions}</p>
          </div>

          {/* Wind & Humidity */}
          <div className="flex flex-col gap-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{windSpeed} mph</span>
            </div>
            {humidity && (
              <div className="flex items-center justify-end gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-sm font-medium">{humidity}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
