import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Bell, Send, History, Settings2 } from 'lucide-react';

const NotificationHistory = lazy(async () => {
  const module = await import('@/components/admin/NotificationHistory');
  return { default: module.NotificationHistory };
});

const SendNotificationForm = lazy(async () => {
  const module = await import('@/components/admin/SendNotificationForm');
  return { default: module.SendNotificationForm };
});

const NotificationMandatorySettings = lazy(async () => {
  const module = await import('@/components/admin/NotificationMandatorySettings');
  return { default: module.NotificationMandatorySettings };
});

export default function NotificationsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'history');
  const tabFallback = (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      Loading notification tools...
    </div>
  );

  // Sync tab from URL on mount or when URL changes
  useEffect(() => {
    if (tabFromUrl && ['history', 'send', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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
        <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
          <TabsTrigger value="history" className="flex items-center gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">History</span>
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Send</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 py-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Mandatory</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Suspense fallback={tabFallback}>
            {activeTab === 'history' ? <NotificationHistory /> : null}
          </Suspense>
        </TabsContent>

        <TabsContent value="send">
          <Suspense fallback={tabFallback}>
            {activeTab === 'send' ? <SendNotificationForm /> : null}
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Suspense fallback={tabFallback}>
            {activeTab === 'settings' ? <NotificationMandatorySettings /> : null}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
