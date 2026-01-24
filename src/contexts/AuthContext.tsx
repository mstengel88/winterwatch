import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('fetchProfile error:', error.message);
      return null;
    }

    return (data as Profile | null) ?? null;
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchRoles error:', error.message);
      return [];
    }

    return (data as { role: AppRole }[] | null)?.map((r) => r.role) ?? [];
  };

  const loadUserData = async (userId: string) => {
    const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
    setProfile(p);
    setRoles(r);
  };

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Initial session load (CRITICAL for OAuth)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        // Defer DB fetches to avoid doing extra async work during initialization
        if (data.session?.user) {
          setTimeout(() => {
            if (!mounted) return;
            loadUserData(data.session!.user.id).finally(() => {
              if (!mounted) return;
              setInitialized(true);
              setIsLoading(false);
            });
          }, 0);
          return;
        }

        setProfile(null);
        setRoles([]);
        setInitialized(true);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setProfile(null);
        setRoles([]);
        setInitialized(true);
        setIsLoading(false);
      });

    // 2️⃣ Live auth updates
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // IMPORTANT: do not call async Supabase operations directly in onAuthStateChange
        setTimeout(() => {
          if (!mounted) return;
          loadUserData(nextSession.user.id).finally(() => {
            if (!mounted) return;
            setInitialized(true);
            setIsLoading(false);
          });
        }, 0);
        return;
      }

      setProfile(null);
      setRoles([]);
      setInitialized(true);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: (error as unknown as Error) ?? null };
  };

  const signUp: AuthContextType['signUp'] = async (email, password, fullName) => {
    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: fullName ? { full_name: fullName.trim() } : undefined,
      },
    });

    return { error: (error as unknown as Error) ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      roles,
      isLoading: isLoading || !initialized,
      signIn,
      signUp,
      signOut,
      hasRole: (r: AppRole) => roles.includes(r),
      isAdminOrManager: () => roles.includes('admin') || roles.includes('manager'),
      isStaff: () => roles.includes('driver') || roles.includes('shovel_crew'),
      refreshProfile: async () => {
        if (!user) return;
        setProfile(await fetchProfile(user.id));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, profile, roles, isLoading, initialized]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
