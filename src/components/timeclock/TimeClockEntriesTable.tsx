import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, MapPin, Pencil, Play, Square, Timer } from "lucide-react";
import { format } from "date-fns";
import * as React from "react";

export interface TimeClockEntriesTableEntry {
  id: string;
  employee_id: string;
  employee: { first_name: string; last_name: string } | null;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  notes: string | null;
  updated_at: string;
}

interface Props {
  entries: TimeClockEntriesTableEntry[];
  clockingOut: string | null;
  onClockOutClick: (entryId: string, employeeName: string) => void;
  isEdited: (entry: TimeClockEntriesTableEntry) => boolean;
  formatTime: (dateString: string | null) => string;
  getDuration: (clockIn: string, clockOut: string | null) => string;
  renderElapsedTime: (clockInTime: string) => React.ReactNode;
}

export function TimeClockEntriesTable({
  entries,
  clockingOut,
  onClockOutClick,
  isEdited,
  formatTime,
  getDuration,
  renderElapsedTime,
}: Props) {
  return (
    <div className="relative max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-md border border-border/50 [-webkit-overflow-scrolling:touch]" style={{ touchAction: 'pan-x pan-y' }}>
      <table className="w-full min-w-[900px] whitespace-nowrap caption-bottom text-sm">
        <thead className="bg-muted/30">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="h-12 px-4 font-medium">Employee</th>
            <th className="h-12 px-4 font-medium">Date</th>
            <th className="h-12 px-4 font-medium">Clock In</th>
            <th className="h-12 px-4 font-medium">Clock Out</th>
            <th className="h-12 px-4 font-medium">Duration</th>
            <th className="h-12 px-4 font-medium">Status</th>
            <th className="h-12 px-4 font-medium w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 15).map((entry) => {
            const employeeName = entry.employee
              ? `${entry.employee.first_name} ${entry.employee.last_name}`
              : "Employee";

            return (
              <tr
                key={entry.id}
                className={
                  "border-b border-border/50 transition-colors hover:bg-muted/50 " +
                  (isEdited(entry) ? "bg-destructive/10" : "")
                }
              >
                <td className="p-4 align-middle font-medium">
                  <div className="flex items-center gap-2">
                    <span>{entry.employee ? employeeName : "-"}</span>
                    {isEdited(entry) && (
                      <Badge
                        variant="outline"
                        className="text-destructive border-destructive/50 gap-1 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        Edited
                      </Badge>
                    )}
                  </div>
                </td>

                <td className="p-4 align-middle">{format(new Date(entry.clock_in_time), "MM/dd/yy")}</td>

                <td className="p-4 align-middle">
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3 text-success" />
                    {formatTime(entry.clock_in_time)}
                  </div>
                  {entry.clock_in_latitude && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      GPS recorded
                    </div>
                  )}
                </td>

                <td className="p-4 align-middle">
                  {entry.clock_out_time ? (
                    <div className="flex items-center gap-1">
                      <Square className="h-3 w-3 text-destructive" />
                      {formatTime(entry.clock_out_time)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                <td className="p-4 align-middle">
                  <div className="flex items-center gap-1 text-sm">
                    <Timer className="h-3 w-3 text-muted-foreground" />
                    {entry.clock_out_time ? getDuration(entry.clock_in_time, entry.clock_out_time) : renderElapsedTime(entry.clock_in_time)}
                  </div>
                </td>

                <td className="p-4 align-middle">
                  {entry.clock_out_time ? (
                    <Badge variant="outline">Completed</Badge>
                  ) : (
                    <Badge className="bg-success/20 text-success border-success/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                      Active
                    </Badge>
                  )}
                </td>

                <td className="p-4 align-middle">
                  {!entry.clock_out_time && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onClockOutClick(entry.id, employeeName)}
                      disabled={clockingOut === entry.id}
                      className="h-7 px-2"
                    >
                      {clockingOut === entry.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-3 w-3 mr-1" />
                          Clock Out
                        </>
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
