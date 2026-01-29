import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, FileText, Clock, Shovel, Trash2, Pencil, Archive, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

const tableLabels: Record<string, string> = {
  work_logs: 'Plow Reports',
  shovel_work_logs: 'Shovel Reports',
  time_clock: 'Time Clock',
};

const tableIcons: Record<string, React.ReactNode> = {
  work_logs: <FileText className="h-4 w-4" />,
  shovel_work_logs: <Shovel className="h-4 w-4" />,
  time_clock: <Clock className="h-4 w-4" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  INSERT: <Plus className="h-4 w-4" />,
  UPDATE: <Pencil className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-500/10 text-green-600 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function AuditLogPage() {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(search) ||
      log.record_id.toLowerCase().includes(search) ||
      tableLabels[log.table_name]?.toLowerCase().includes(search)
    );
  });

  const getActionLabel = (log: AuditLog) => {
    if (log.action === 'UPDATE' && log.changed_fields?.includes('billing_status')) {
      const oldStatus = log.old_data?.billing_status;
      const newStatus = log.new_data?.billing_status;
      if (newStatus === 'completed') return 'Archived';
      if (oldStatus === 'completed' && newStatus === 'billable') return 'Unarchived';
      if (newStatus === 'billable') return 'Moved to Billable';
      if (newStatus === 'current') return 'Moved to Current';
    }
    return log.action;
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Track changes to reports and timesheets</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by email or record ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="work_logs">Plow Reports</SelectItem>
                <SelectItem value="shovel_work_logs">Shovel Reports</SelectItem>
                <SelectItem value="time_clock">Time Clock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredLogs?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tableIcons[log.table_name]}
                          <span>{tableLabels[log.table_name] || log.table_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={actionColors[log.action]}>
                          <span className="flex items-center gap-1">
                            {actionIcons[log.action]}
                            {getActionLabel(log)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {log.user_email || 'System'}
                      </TableCell>
                      <TableCell className="whitespace-normal max-w-[200px]">
                        {log.changed_fields?.length ? (
                          <span className="text-sm text-muted-foreground">
                            {log.changed_fields.slice(0, 3).join(', ')}
                            {log.changed_fields.length > 3 && ` +${log.changed_fields.length - 3} more`}
                          </span>
                        ) : log.action === 'DELETE' ? (
                          <span className="text-sm text-muted-foreground">Record deleted</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">New record</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && tableIcons[selectedLog.table_name]}
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{tableLabels[selectedLog.table_name]}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action:</span>
                    <p>
                      <Badge variant="outline" className={actionColors[selectedLog.action]}>
                        {getActionLabel(selectedLog)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date/Time:</span>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), 'MMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Changed By:</span>
                    <p className="font-medium">{selectedLog.user_email || 'System'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Record ID:</span>
                    <p className="font-mono text-xs">{selectedLog.record_id}</p>
                  </div>
                </div>

                {selectedLog.changed_fields?.length ? (
                  <div>
                    <h4 className="font-medium mb-2">Changed Fields</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Before</TableHead>
                            <TableHead>After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLog.changed_fields.map((field) => (
                            <TableRow key={field}>
                              <TableCell className="font-medium">{field}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatFieldValue(selectedLog.old_data?.[field])}
                              </TableCell>
                              <TableCell>
                                {formatFieldValue(selectedLog.new_data?.[field])}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : selectedLog.action === 'DELETE' && selectedLog.old_data ? (
                  <div>
                    <h4 className="font-medium mb-2">Deleted Record Data</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                ) : selectedLog.action === 'INSERT' && selectedLog.new_data ? (
                  <div>
                    <h4 className="font-medium mb-2">Created Record Data</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
