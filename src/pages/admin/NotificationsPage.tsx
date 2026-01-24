import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Bell, Send, History, Settings2 } from 'lucide-react';
import { NotificationHistory } from '@/components/admin/NotificationHistory';
import { SendNotificationForm } from '@/components/admin/SendNotificationForm';
import { NotificationMandatorySettings } from '@/components/admin/NotificationMandatorySettings';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="container py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notification Center</h1>
            <p className="text-muted-foreground">View sent notifications and send new ones</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/notification-types">
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Types
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Mandatory Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <NotificationHistory />
        </TabsContent>

        <TabsContent value="send">
          <SendNotificationForm />
        </TabsContent>

        <TabsContent value="settings">
          <NotificationMandatorySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
