export type ServiceType = 'plow' | 'salt' | 'both' | 'shovel' | 'ice_melt';
export type WorkStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type EmployeeCategory = 'plow' | 'shovel' | 'both' | 'manager';

export interface Account {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  client_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  priority: number;
  geofence_radius: number;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  license_plate: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: string;
  notes: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  category: EmployeeCategory;
  hourly_rate: number | null;
  is_active: boolean;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLog {
  id: string;
  account_id: string;
  employee_id: string | null;
  equipment_id: string | null;
  service_type: ServiceType;
  status: WorkStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  snow_depth_inches: number | null;
  salt_used_lbs: number | null;
  weather_conditions: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  employee?: Employee;
  equipment?: Equipment;
}

export interface ShovelWorkLog {
  id: string;
  account_id: string;
  employee_id: string | null;
  service_type: ServiceType;
  status: WorkStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  areas_cleared: string[] | null;
  ice_melt_used_lbs: number | null;
  weather_conditions: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  employee?: Employee;
}

export interface TimeClockEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: Employee;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}