import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Save, Lock, Bell } from 'lucide-react';

interface NotificationType {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
  is_mandatory: boolean;
  is_active: boolean;
}

export function NotificationMandatorySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchNotificationTypes();
  }, []);

  const fetchNotificationTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_types')
        .select('id, name, label, is_system, is_mandatory, is_active')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('label');

      if (error) {
        console.error('Error fetching notification types:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load notification types',
        });
        return;
      }

      setTypes(data || []);
      const settingsMap: Record<string, boolean> = {};
      data?.forEach((type) => {
        settingsMap[type.id] = type.is_mandatory;
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
      // Update each notification type's is_mandatory flag
      const updates = Object.entries(settings).map(([id, is_mandatory]) =>
        supabase
          .from('notification_types')
          .update({ is_mandatory })
          .eq('id', id)
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
        {types.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No active notification types found
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">{type.label}</Label>
                      {type.is_system && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" />
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {settings[type.id]
                        ? 'Mandatory - employees cannot disable'
                        : 'Optional - employees can disable'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings[type.id] || false}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, [type.id]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving || types.length === 0} className="w-full">
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
