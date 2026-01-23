import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, AppRole, Profile } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false); // 🔥 important

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile;
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    return (data as { role: AppRole }[] | null)?.map(r => r.role) ?? [];
  };

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Initial session load (CRITICAL for OAuth)
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        const [p, r] = await Promise.all([
          fetchProfile(data.session.user.id),
          fetchRoles(data.session.user.id),
        ]);
        setProfile(p);
        setRoles(r);
      }

      setInitialized(true);
      setIsLoading(false);
    });

    // 2️⃣ Live auth updates
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [p, r] = await Promise.all([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id),
          ]);
          setProfile(p);
          setRoles(r);
        } else {
          setProfile(null);
          setRoles([]);
        }

        setInitialized(true);
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading: isLoading || !initialized, // 🔥 THIS IS THE FIX
        signOut,
        hasRole: (r: AppRole) => roles.includes(r),
        isAdminOrManager: () => roles.includes('admin') || roles.includes('manager'),
        isStaff: () => roles.includes('driver') || roles.includes('shovel_crew'),
        refreshProfile: async () => {
          if (user) setProfile(await fetchProfile(user.id));
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
