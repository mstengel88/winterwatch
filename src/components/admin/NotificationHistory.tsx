import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Clock, MapPin, Megaphone, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationLog {
  id: string;
  user_id: string;
  notification_type: 'shift_status' | 'geofence_alert' | 'admin_announcement';
  title: string;
  body: string;
  data: unknown;
  sent_at: string;
  read_at: string | null;
  onesignal_id: string | null;
  delivery_status: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const NOTIFICATION_TYPE_CONFIG = {
  shift_status: { label: 'Shift Status', icon: Clock, color: 'bg-blue-500/10 text-blue-500' },
  geofence_alert: { label: 'Geofence Alert', icon: MapPin, color: 'bg-orange-500/10 text-orange-500' },
  admin_announcement: { label: 'Announcement', icon: Megaphone, color: 'bg-purple-500/10 text-purple-500' },
};

export function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      // First fetch notifications
      const { data: logsData, error: logsError } = await supabase
        .from('notifications_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Then fetch profiles for all user_ids
      const userIds = [...new Set((logsData || []).map((log) => log.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Create a map of user_id to profile
      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
      );

      // Merge notifications with profiles
      const notificationsWithProfiles: NotificationLog[] = (logsData || []).map((log) => ({
        ...log,
        profile: profileMap.get(log.user_id) || null,
      }));

      setNotifications(notificationsWithProfiles);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || notification.notification_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getDeliveryStatusBadge = (status: string | null, readAt: string | null) => {
    if (readAt) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Read
        </Badge>
      );
    }
    if (status === 'sent') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Unknown
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
        <CardDescription>
          View all sent notifications and their delivery status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="shift_status">Shift Status</SelectItem>
              <SelectItem value="geofence_alert">Geofence Alert</SelectItem>
              <SelectItem value="admin_announcement">Announcement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => {
                  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.notification_type];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Badge variant="outline" className={typeConfig.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {notification.profile?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {notification.profile?.email || notification.user_id.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.body}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(notification.sent_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        {getDeliveryStatusBadge(notification.delivery_status, notification.read_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
