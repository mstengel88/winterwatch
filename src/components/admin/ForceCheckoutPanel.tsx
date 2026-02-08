import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, LogOut, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ActiveLog {
  id: string;
  type: "plow" | "shovel";
  account_name: string;
  employee_name: string;
  employee_id: string;
  check_in_time: string;
}

export function ForceCheckoutPanel() {
  const [activeLogs, setActiveLogs] = useState<ActiveLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceCheckingOut, setForceCheckingOut] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ActiveLog | null>(null);

  const fetchActiveLogs = async () => {
    setIsLoading(true);
    try {
      const [plowRes, shovelRes] = await Promise.all([
        supabase
          .from("work_logs")
          .select("id, check_in_time, employee_id, account:accounts(name), employee:employees(first_name, last_name)")
          .eq("status", "in_progress")
          .order("check_in_time", { ascending: false }),
        supabase
          .from("shovel_work_logs")
          .select("id, check_in_time, employee_id, account:accounts(name), employee:employees(first_name, last_name)")
          .eq("status", "in_progress")
          .order("check_in_time", { ascending: false }),
      ]);

      const plow: ActiveLog[] = (plowRes.data || []).map((l: any) => ({
        id: l.id,
        type: "plow",
        account_name: l.account?.name || "Unknown",
        employee_name: l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : "Unknown",
        employee_id: l.employee_id || "",
        check_in_time: l.check_in_time,
      }));

      const shovel: ActiveLog[] = (shovelRes.data || []).map((l: any) => ({
        id: l.id,
        type: "shovel",
        account_name: l.account?.name || "Unknown",
        employee_name: l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : "Unknown",
        employee_id: l.employee_id || "",
        check_in_time: l.check_in_time,
      }));

      setActiveLogs([...plow, ...shovel].sort((a, b) =>
        new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
      ));
    } catch (err) {
      console.error("Error fetching active logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLogs();
  }, []);

  const handleForceCheckout = async () => {
    if (!confirmTarget) return;
    setForceCheckingOut(confirmTarget.id);

    try {
      const table = confirmTarget.type === "plow" ? "work_logs" : "shovel_work_logs";
      const now = new Date().toISOString();

      const { error } = await supabase
        .from(table)
        .update({
          status: "completed",
          check_out_time: now,
          notes: "Force checked out by admin",
        } as any)
        .eq("id", confirmTarget.id);

      if (error) throw error;

      toast.success(`Force checked out ${confirmTarget.employee_name} from ${confirmTarget.account_name}`);
      setActiveLogs((prev) => prev.filter((l) => l.id !== confirmTarget.id));
    } catch (err) {
      console.error("Force checkout error:", err);
      toast.error("Failed to force check out");
    } finally {
      setForceCheckingOut(null);
      setConfirmTarget(null);
    }
  };

  if (activeLogs.length === 0 && !isLoading) return null;

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Active Work Logs ({activeLogs.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchActiveLogs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Force check out employees stuck on an account
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {activeLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{log.employee_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.type === "plow" ? "Plow" : "Shovel"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {log.account_name} · Checked in {log.check_in_time ? format(new Date(log.check_in_time), "MMM d, h:mm a") : "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2 shrink-0"
                    disabled={forceCheckingOut === log.id}
                    onClick={() => setConfirmTarget(log)}
                  >
                    {forceCheckingOut === log.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-3 w-3 mr-1" />
                        Force Out
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Check Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to force check out{" "}
              <strong>{confirmTarget?.employee_name}</strong> from{" "}
              <strong>{confirmTarget?.account_name}</strong>? This will end
              their active session immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceCheckout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Force Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
