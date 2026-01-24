import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Clock, MapPin, Megaphone, Save } from 'lucide-react';

interface SystemNotificationType {
  name: string;
  is_mandatory: boolean;
}

const SYSTEM_TYPES = [
  { name: 'shift_status', label: 'Shift Status Notifications', icon: Clock, color: 'text-blue-500' },
  { name: 'geofence_alert', label: 'Geofence Alert Notifications', icon: MapPin, color: 'text-orange-500' },
  { name: 'admin_announcement', label: 'Admin Announcement Notifications', icon: Megaphone, color: 'text-purple-500' },
];

export function NotificationMandatorySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSystemTypes();
  }, []);

  const fetchSystemTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_types')
        .select('name, is_mandatory')
        .eq('is_system', true);

      if (error) {
        console.error('Error fetching notification types:', error);
        return;
      }

      const settingsMap: Record<string, boolean> = {};
      data?.forEach((type) => {
        settingsMap[type.name] = type.is_mandatory;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each system notification type's is_mandatory flag
      const updates = Object.entries(settings).map(([name, is_mandatory]) =>
        supabase
          .from('notification_types')
          .update({ is_mandatory })
          .eq('name', name)
          .eq('is_system', true)
      );

      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        throw new Error('Failed to update some settings');
      }

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
          {SYSTEM_TYPES.map(({ name, label, icon: Icon, color }) => (
            <div key={name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {settings[name]
                      ? 'Mandatory - employees cannot disable'
                      : 'Optional - employees can disable'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings[name] || false}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, [name]: checked }))
                }
              />
            </div>
          ))}
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
