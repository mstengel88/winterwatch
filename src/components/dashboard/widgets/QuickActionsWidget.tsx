import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LogIn, 
  LogOut, 
  Play, 
  Square, 
  MapPin, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsWidgetProps {
  isShiftActive: boolean;
  isCheckedIn: boolean;
  hasAccountSelected: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRefreshLocation?: () => void;
  isLoading?: boolean;
  variant?: 'driver' | 'shovel';
  className?: string;
  nearestAccountName?: string;
}

export function QuickActionsWidget({
  isShiftActive,
  isCheckedIn,
  hasAccountSelected,
  onClockIn,
  onClockOut,
  onCheckIn,
  onCheckOut,
  onRefreshLocation,
  isLoading = false,
  variant = 'driver',
  className,
  nearestAccountName,
}: QuickActionsWidgetProps) {
  const isDriver = variant === 'driver';
  const accentColor = isDriver ? 'bg-primary hover:bg-primary/90' : 'bg-purple-600 hover:bg-purple-700';
  const accentBg = isDriver ? 'bg-primary/10' : 'bg-purple-500/10';

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className={cn('h-4 w-4', isDriver ? 'text-primary' : 'text-purple-400')} />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Shift Control */}
        <div className={cn('p-3 rounded-lg', accentBg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                isShiftActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
              )} />
              <span className="text-sm font-medium">
                {isShiftActive ? 'Shift Active' : 'Shift Inactive'}
              </span>
            </div>
            {isShiftActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onClockOut}
                disabled={isLoading}
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4 mr-1" />
                End
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onClockIn}
                disabled={isLoading}
                className={accentColor}
              >
                <LogIn className="h-4 w-4 mr-1" />
                Start Shift
              </Button>
            )}
          </div>
        </div>

        {/* Check-in Control */}
        {isShiftActive && (
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isCheckedIn ? 'text-green-500' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm font-medium truncate">
                    {isCheckedIn 
                      ? 'Working on site' 
                      : nearestAccountName 
                        ? `Near: ${nearestAccountName}`
                        : 'Select account'}
                  </span>
                </div>
              </div>
              {isCheckedIn ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCheckOut}
                  disabled={isLoading}
                  className="border-green-500/50 text-green-500 hover:bg-green-500/20 flex-shrink-0"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onCheckIn}
                  disabled={isLoading || !hasAccountSelected}
                  className={cn(accentColor, 'flex-shrink-0')}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Check In
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Refresh Location */}
        {onRefreshLocation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshLocation}
            disabled={isLoading}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh Location
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
