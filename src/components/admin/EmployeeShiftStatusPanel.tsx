import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Clock, Loader2, RefreshCw, Square } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmployeeShiftRow {
  employee_id: string;
  first_name: string;
  last_name: string;
  category: string;
  is_active: boolean;
  shift_id: string | null;
  clock_in_time: string | null;
}

// Real-time elapsed time component
function ElapsedTime({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(clockInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [clockInTime]);

  return <span className="font-mono tabular-nums text-sm">{elapsed}</span>;
}

export function EmployeeShiftStatusPanel() {
  const [rows, setRows] = useState<EmployeeShiftRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [endingShift, setEndingShift] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<EmployeeShiftRow | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all active employees (exclude manager/trucker categories for field staff)
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, first_name, last_name, category, is_active")
        .eq("is_active", true)
        .order("first_name");

      if (empError) throw empError;

      // Fetch all active shifts (no clock_out_time)
      const { data: activeShifts, error: shiftError } = await supabase
        .from("time_clock")
        .select("id, employee_id, clock_in_time")
        .is("clock_out_time", null);

      if (shiftError) throw shiftError;

      const shiftMap = new Map(
        (activeShifts || []).map((s) => [s.employee_id, s])
      );

      const combined: EmployeeShiftRow[] = (employees || []).map((emp) => {
        const shift = shiftMap.get(emp.id);
        return {
          employee_id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          category: emp.category,
          is_active: emp.is_active,
          shift_id: shift?.id ?? null,
          clock_in_time: shift?.clock_in_time ?? null,
        };
      });

      // Sort: clocked-in first, then alphabetical
      combined.sort((a, b) => {
        if (a.shift_id && !b.shift_id) return -1;
        if (!a.shift_id && b.shift_id) return 1;
        return a.first_name.localeCompare(b.first_name);
      });

      setRows(combined);
    } catch (err) {
      console.error("Error fetching employee shift data:", err);
      toast.error("Failed to load employee shift data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleForceEndShift = async () => {
    if (!confirmTarget?.shift_id) return;
    setEndingShift(confirmTarget.shift_id);

    try {
      const { error } = await supabase
        .from("time_clock")
        .update({
          clock_out_time: new Date().toISOString(),
          notes: "Force ended by admin",
        })
        .eq("id", confirmTarget.shift_id);

      if (error) throw error;

      toast.success(
        `Force ended shift for ${confirmTarget.first_name} ${confirmTarget.last_name}`
      );
      setRows((prev) =>
        prev.map((r) =>
          r.shift_id === confirmTarget.shift_id
            ? { ...r, shift_id: null, clock_in_time: null }
            : r
        )
      );
    } catch (err) {
      console.error("Force end shift error:", err);
      toast.error("Failed to end shift");
    } finally {
      setEndingShift(null);
      setConfirmTarget(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Employee Shift Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No employees found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clocked In</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employee_id}>
                    <TableCell className="font-medium">
                      {row.first_name} {row.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {row.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.shift_id ? (
                        <Badge className="bg-success/20 text-success border-success/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                          Clocked In
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Off</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.clock_in_time
                        ? format(new Date(row.clock_in_time), "h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.clock_in_time ? (
                        <ElapsedTime clockInTime={row.clock_in_time} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.shift_id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                          disabled={endingShift === row.shift_id}
                          onClick={() => setConfirmTarget(row)}
                        >
                          {endingShift === row.shift_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Square className="h-3 w-3 mr-1" />
                              End Shift
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force End Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to force end the shift for{" "}
              <strong>
                {confirmTarget?.first_name} {confirmTarget?.last_name}
              </strong>
              ? This will clock them out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceEndShift}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Force End Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
