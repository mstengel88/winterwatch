export type WorkLogColumn =
  | 'type'
  | 'date'
  | 'checkIn'
  | 'checkOut'
  | 'duration'
  | 'account'
  | 'serviceType'
  | 'snowDepth'
  | 'saltLbs'
  | 'equipment'
  | 'employee'
  | 'conditions'
  | 'notes';

export const WORK_LOG_COLUMNS: { key: WorkLogColumn; label: string }[] = [
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date' },
  { key: 'checkIn', label: 'Check In' },
  { key: 'checkOut', label: 'Check Out' },
  { key: 'duration', label: 'Duration' },
  { key: 'account', label: 'Account' },
  { key: 'serviceType', label: 'Service' },
  { key: 'snowDepth', label: 'Snow' },
  { key: 'saltLbs', label: 'Salt' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'employee', label: 'Employee' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'notes', label: 'Notes' },
];

export const DEFAULT_VISIBLE_COLUMNS: WorkLogColumn[] = WORK_LOG_COLUMNS.map((column) => column.key);
