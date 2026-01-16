import { WorkLog, ShovelWorkLog, Account } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MapPin } from 'lucide-react';

interface RecentWorkListProps {
  workLogs: (WorkLog | ShovelWorkLog)[];
  variant?: 'plow' | 'shovel';
}

export function RecentWorkList({ workLogs, variant = 'plow' }: RecentWorkListProps) {
  if (workLogs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No work logs today</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return '--';
    const start = new Date(checkIn).getTime();
    const end = checkOut ? new Date(checkOut).getTime() : Date.now();
    const diff = end - start;
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-3">
      {workLogs.map((log) => {
        const account = log.account as Account | undefined;
        
        return (
          <Card key={log.id}>
            <CardHeader className="py-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {account?.name || 'Unknown Account'}
                  </CardTitle>
                  {account && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {account.address}
                    </CardDescription>
                  )}
                </div>
                {getStatusBadge(log.status)}
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatTime(log.check_in_time)} - {formatTime(log.check_out_time)}
                </span>
                <span className="font-medium">
                  {calculateDuration(log.check_in_time, log.check_out_time)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}