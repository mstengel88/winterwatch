import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Clock, MapPin, Megaphone, Save } from 'lucide-react';

interface MandatorySettings {
  mandatory_shift_status: boolean;
  mandatory_geofence_alerts: boolean;
  mandatory_admin_announcements: boolean;
}

export function NotificationMandatorySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<MandatorySettings>({
    mandatory_shift_status: false,
    mandatory_geofence_alerts: false,
    mandatory_admin_announcements: false,
  });

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    setIsLoading(true);
    try {
      // Get an aggregated view - if any user has mandatory settings, we consider it set
      // For simplicity, we'll use a settings approach with the first admin's preferences
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('mandatory_shift_status, mandatory_geofence_alerts, mandatory_admin_announcements')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        setSettings({
          mandatory_shift_status: data.mandatory_shift_status || false,
          mandatory_geofence_alerts: data.mandatory_geofence_alerts || false,
          mandatory_admin_announcements: data.mandatory_admin_announcements || false,
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update all notification_preferences to set mandatory flags
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          mandatory_shift_status: settings.mandatory_shift_status,
          mandatory_geofence_alerts: settings.mandatory_geofence_alerts,
          mandatory_admin_announcements: settings.mandatory_admin_announcements,
        })
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Mandatory notification settings have been updated',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
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
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Mandatory Notification Settings
        </CardTitle>
        <CardDescription>
          Configure which notification types cannot be disabled by employees.
          When enabled, employees will not be able to turn off these notifications in their settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Shift Status Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Employees cannot disable shift start/end alerts
                </p>
              </div>
            </div>
            <Switch
              checked={settings.mandatory_shift_status}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, mandatory_shift_status: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-orange-500" />
              <div>
                <Label className="text-sm font-medium">Geofence Alert Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Employees cannot disable location-based alerts
                </p>
              </div>
            </div>
            <Switch
              checked={settings.mandatory_geofence_alerts}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, mandatory_geofence_alerts: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-purple-500" />
              <div>
                <Label className="text-sm font-medium">Admin Announcement Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Employees cannot disable admin announcements
                </p>
              </div>
            </div>
            <Switch
              checked={settings.mandatory_admin_announcements}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, mandatory_admin_announcements: checked }))
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
