import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderNotificationBellProps {
  userId: string | null | undefined;
}

export function AppHeaderNotificationBell({ userId }: AppHeaderNotificationBellProps) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);

      setUnreadCount(count || 0);
    };

    void fetchUnread();

    const channel = supabase
      .channel(`notifications-bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications_log", filter: `user_id=eq.${userId}` },
        () => void fetchUnread(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications_log", filter: `user_id=eq.${userId}` },
        () => void fetchUnread(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleOpenNotifications = () => {
    if (userId && unreadCount > 0) {
      void supabase
        .from("notifications_log")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null)
        .then(() => setUnreadCount(0));
    }

    navigate("/admin/notifications");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 rounded-full text-muted-foreground"
      onClick={handleOpenNotifications}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
