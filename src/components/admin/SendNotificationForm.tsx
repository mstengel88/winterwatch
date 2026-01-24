import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Users, User } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string | null;
}

export function SendNotificationForm() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [notificationType, setNotificationType] = useState<string>('admin_announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id')
        .eq('is_active', true)
        .not('user_id', 'is', null)
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeToggle = (userId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in both title and message',
      });
      return;
    }

    if (!sendToAll && selectedEmployees.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one recipient',
      });
      return;
    }

    setIsSending(true);
    try {
      const payload: {
        notification_type: string;
        title: string;
        body: string;
        broadcast?: boolean;
        user_ids?: string[];
      } = {
        notification_type: notificationType,
        title: title.trim(),
        body: body.trim(),
      };

      if (sendToAll) {
        payload.broadcast = true;
      } else {
        payload.user_ids = selectedEmployees;
      }

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: 'Notification Sent',
        description: `Successfully sent to ${data.sent_count} device(s)`,
      });

      // Reset form
      setTitle('');
      setBody('');
      setSelectedEmployees([]);
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Notification</CardTitle>
        <CardDescription>Send push notifications to employees</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="type">Notification Type</Label>
          <Select value={notificationType} onValueChange={setNotificationType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin_announcement">Admin Announcement</SelectItem>
              <SelectItem value="shift_status">Shift Status</SelectItem>
              <SelectItem value="geofence_alert">Geofence Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            placeholder="Notification message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <Label>Recipients</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-all"
              checked={sendToAll}
              onCheckedChange={(checked) => setSendToAll(checked === true)}
            />
            <label
              htmlFor="send-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Send to all employees
            </label>
          </div>

          {!sendToAll && (
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No employees with linked accounts found
                </p>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={selectedEmployees.includes(employee.user_id!)}
                      onCheckedChange={() => handleEmployeeToggle(employee.user_id!)}
                    />
                    <label
                      htmlFor={employee.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      {employee.first_name} {employee.last_name}
                    </label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Button onClick={handleSend} disabled={isSending} className="w-full">
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
