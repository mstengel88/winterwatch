import { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'manager' | 'driver' | 'shovel_crew' | 'client' | 'work_log_viewer';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  created_by: string | null;
}

export interface Profile {
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
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdminOrManager: () => boolean;
  isStaff: () => boolean;
  refreshProfile: () => Promise<void>;
}