import { User, Session } from '@supabase/supabase-js';

export type AppRole =
  | 'admin'
  | 'manager'
  | 'driver'
  | 'dispatch_driver'
  | 'shovel_crew'
  | 'client'
  | 'work_log_viewer'
  | 'trucker';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  organization_id: string;
  created_at: string;
  created_by: string | null;
}

export interface Profile {
  active_organization_id: string | null;
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeOrganizationId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdminOrManager: () => boolean;
  isStaff: () => boolean;
  refreshProfile: () => Promise<void>;
}
