import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, CheckCircle2, Truck, Footprints, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftStatsWidgetProps {
  totalJobs: number;
  completedJobs: number;
  primaryServiceCount: number;
  secondaryServiceCount: number;
  hoursWorked: string;
  accountsAvailable: number;
  variant?: 'driver' | 'shovel';
  className?: string;
}

export function ShiftStatsWidget({
  totalJobs,
  completedJobs,
  primaryServiceCount,
  secondaryServiceCount,
  hoursWorked,
  accountsAvailable,
  variant = 'driver',
  className,
}: ShiftStatsWidgetProps) {
  const isDriver = variant === 'driver';
  const accentColor = isDriver ? 'text-primary' : 'text-purple-400';
  const bgAccent = isDriver ? 'bg-primary/10' : 'bg-purple-500/10';

  const stats = [
    {
      icon: CheckCircle2,
      value: completedJobs,
      label: 'Completed',
      color: 'text-green-500',
    },
    {
      icon: isDriver ? Truck : Footprints,
      value: primaryServiceCount,
      label: isDriver ? 'Plowed' : 'Shoveled',
      color: accentColor,
    },
    {
      icon: Snowflake,
      value: secondaryServiceCount,
      label: isDriver ? 'Salted' : 'Ice Melt',
      color: 'text-blue-400',
    },
    {
      icon: MapPin,
      value: accountsAvailable,
      label: 'Accounts',
      color: 'text-muted-foreground',
    },
  ];

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className={cn('h-4 w-4', accentColor)} />
          Today's Stats
          <span className={cn('ml-auto text-lg font-bold', accentColor)}>
            {hoursWorked}h
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg',
                bgAccent
              )}
            >
              <stat.icon className={cn('h-4 w-4 mb-1', stat.color)} />
              <span className="text-xl font-bold">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
