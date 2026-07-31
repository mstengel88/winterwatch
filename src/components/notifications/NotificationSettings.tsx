import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, MapPin, Megaphone, Volume2, Lock } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PushDiagnostics } from '@/components/notifications/PushDiagnostics';

const SOUND_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'alert', label: 'Alert' },
  { value: 'none', label: 'Silent' },
] as const;

export function NotificationSettings() {
  const {
    isRegistered,
    isLoading,
    preferences,
    permissionStatus,
    savePreferences,
    registerDevice,
    unregisterDevice,
    isNativePlatform,
  } = usePushNotifications();
  
  const [isToggling, setIsToggling] = useState(false);

  if (!isNativePlatform) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are only available on the iOS app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Download the WinterWatch Pro app from the App Store to receive push notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if any notification type is mandatory
  const isMandatoryShiftStatus = preferences.mandatory_shift_status;
  const isMandatoryGeofence = preferences.mandatory_geofence_alerts;
  const isMandatoryAnnouncements = preferences.mandatory_admin_announcements;

  const handleMasterToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        await registerDevice();
      } else {
        await unregisterDevice();
      }
    } catch (err) {
      console.error('[NotificationSettings] Toggle failed:', err);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Customize which notifications you receive
            </CardDescription>
          </div>
          <Badge variant={isRegistered ? 'default' : 'secondary'}>
            {isRegistered ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        {permissionStatus === 'denied' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">
              Push notifications are blocked. Please enable them in your device settings.
            </p>
          </div>
        )}

        {/* Master Enable/Disable Switch */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="push-master" className="text-sm font-medium">
                Push Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRegistered ? 'Receiving notifications on this device' : 'Enable to receive alerts'}
              </p>
            </div>
          </div>
          <Switch
            id="push-master"
            checked={isRegistered}
            disabled={isToggling || permissionStatus === 'denied'}
            onCheckedChange={handleMasterToggle}
          />
        </div>

        {isRegistered && (
          <>
            {/* Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Types</h4>
              
              {/* Shift Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="shift-status" className="text-sm font-medium flex items-center gap-2">
                      Shift Status
                      {isMandatoryShiftStatus && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This notification is required by your administrator</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When shifts are started, completed, or modified
                    </p>
                  </div>
                </div>
                <Switch
                  id="shift-status"
                  checked={isMandatoryShiftStatus || preferences.shift_status_enabled}
                  disabled={isMandatoryShiftStatus}
                  onCheckedChange={(checked) => 
                    savePreferences({ shift_status_enabled: checked })
                  }
                />
              </div>

              {/* Geofence Alerts */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="geofence" className="text-sm font-medium flex items-center gap-2">
                      Geofence Alerts
                      {isMandatoryGeofence && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This notification is required by your administrator</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When approaching or leaving job sites
                    </p>
                  </div>
                </div>
                <Switch
                  id="geofence"
                  checked={isMandatoryGeofence || preferences.geofence_alerts_enabled}
                  disabled={isMandatoryGeofence}
                  onCheckedChange={(checked) => 
                    savePreferences({ geofence_alerts_enabled: checked })
                  }
                />
              </div>

              {/* Admin Announcements */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="announcements" className="text-sm font-medium flex items-center gap-2">
                      Admin Announcements
                      {isMandatoryAnnouncements && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This notification is required by your administrator</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Messages from managers and administrators
                    </p>
                  </div>
                </div>
                <Switch
                  id="announcements"
                  checked={isMandatoryAnnouncements || preferences.admin_announcements_enabled}
                  disabled={isMandatoryAnnouncements}
                  onCheckedChange={(checked) => 
                    savePreferences({ admin_announcements_enabled: checked })
                  }
                />
              </div>
            </div>

            {/* Sound Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Sound</h4>
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <Select
                  value={preferences.notification_sound}
                  onValueChange={(value) => 
                    savePreferences({ 
                      notification_sound: value as typeof preferences.notification_sound 
                    })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Admin-only: show what plugin globals exist on-device */}
        <PushDiagnostics />
      </CardContent>
    </Card>
  );
}
