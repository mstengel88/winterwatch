import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { PublicButton, PublicLabel } from '@/components/public/PublicUI';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Users, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { getPublicWebAppUrl } from '@/lib/publicWebUrl';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [portalType, setPortalType] = useState<'staff' | 'client'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  

  const from = location.state?.from?.pathname || '/app';


  // Redirect when authenticated
  useEffect(() => {
    if (hasSession && !isCheckingSession) {
      navigate(from, { replace: true });
    }
  }, [hasSession, isCheckingSession, navigate, from]);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.error('Failed to check auth session:', error);
        setHasSession(false);
      } else {
        setHasSession(Boolean(data.session));
      }

      setIsCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(Boolean(session));
      setIsCheckingSession(false);
    });

    void checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const portal = searchParams.get('portal');
    if (portal === 'client' || portal === 'staff') {
      setPortalType(portal);
    }
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  // Listen for native OAuth success event (from deepLinkAuth.ts)
  useEffect(() => {
    const handleNativeAuthSuccess = () => {
      console.log("📱 Native auth success event received, navigating...");
      // Navigate to "/app" which uses RoleBasedRedirect to determine the correct destination.
      setTimeout(() => {
        navigate("/app", { replace: true });
      }, 100);
    };

    window.addEventListener("nativeAuthSuccess", handleNativeAuthSuccess);
    return () => window.removeEventListener("nativeAuthSuccess", handleNativeAuthSuccess);
  }, [navigate, from]);

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string; fullName?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && !trimmedFullName) {
      nextErrors.fullName = 'Full name is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Login failed',
              description: 'Invalid email or password. Please try again.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Login failed',
              description: error.message,
            });
          }
        } else {
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: getPublicWebAppUrl('/auth/callback'),
            data: fullName ? { full_name: fullName.trim() } : undefined,
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: 'destructive',
              title: 'Sign up failed',
              description: 'An account with this email already exists. Please sign in instead.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Sign up failed',
              description: error.message,
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Please check your email to confirm your account, or sign in if email confirmation is disabled.',
          });
          setIsLogin(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const redirectTo = Capacitor.isNativePlatform()
      ? 'winterwatch://auth/callback'
      : getPublicWebAppUrl('/auth/callback');
    const isNative = Capacitor.isNativePlatform();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...(isNative ? { skipBrowserRedirect: true } : {}),
      },
    });

    if (!error && isNative && data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Google sign in failed',
        description: error.message,
      });
    }
  };

  const handleAppleSignIn = async () => {
    const redirectTo = Capacitor.isNativePlatform()
      ? 'winterwatch://auth/callback'
      : getPublicWebAppUrl('/auth/callback');
    const isNative = Capacitor.isNativePlatform();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        ...(isNative ? { skipBrowserRedirect: true } : {}),
      },
    });

    if (!error && isNative && data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Apple sign in failed',
        description: error.message,
      });
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-muted to-card border-4 border-border shadow-lg">
          <svg viewBox="0 0 100 100" className="h-12 w-12 text-primary">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
            <path 
              d="M50 20 L50 80 M25 35 L75 65 M75 35 L25 65" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="8" fill="currentColor" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-foreground">WinterWatch-Pro</h1>
        <p className="text-muted-foreground">Field Service Management System</p>
      </div>

      {/* Portal Type Tabs */}
      <div className="mb-6 grid w-full max-w-md grid-cols-2 rounded-lg bg-muted/50 p-1" role="tablist" aria-label="Portal type">
        <button
          type="button"
          role="tab"
          aria-selected={portalType === 'staff'}
          onClick={() => setPortalType('staff')}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
            portalType === 'staff' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Staff Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={portalType === 'client'}
          onClick={() => setPortalType('client')}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
            portalType === 'client' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Client Portal
        </button>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? 'Sign in to access your dashboard' : 'Sign up to get started'}
            </p>
          </div>

          <form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            name={isLogin ? 'login' : 'signup'}
            autoComplete="on"
          >
            {!isLogin && (
              <div className="space-y-2">
                <PublicLabel htmlFor="fullName" className="text-foreground">Full Name</PublicLabel>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="name"
                  className="bg-muted/50 border-border/50"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
                <PublicLabel htmlFor="email" className="text-foreground">Email</PublicLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete={isLogin ? 'username email' : 'email'}
                className="bg-muted/50 border-border/50"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
                <PublicLabel htmlFor="password" className="text-foreground">Password</PublicLabel>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="bg-muted/50 border-border/50 pr-10"
                />
                <PublicButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </PublicButton>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {isLogin && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      id="stayLoggedIn"
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={(event) => setStayLoggedIn(event.target.checked)}
                      className="h-4 w-4 rounded border border-input bg-background accent-primary"
                    />
                    <PublicLabel
                      htmlFor="stayLoggedIn"
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Stay logged in
                    </PublicLabel>
                  </div>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

              </div>
            )}

            <PublicButton type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isLogin ? 'Sign In' : 'Create account'}
            </PublicButton>

          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            <PublicButton
              variant="outline" 
              className="w-full gap-2 bg-muted/30 border-border/50" 
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </PublicButton>

            <PublicButton
              variant="outline" 
              className="w-full gap-2 bg-muted/30 border-border/50" 
              onClick={handleAppleSignIn}
              disabled={isSubmitting}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </PublicButton>
          </div>

          {/* Toggle Login/Signup */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © 2026 WinterWatch-Pro. All rights reserved.
      </p>
    </main>
  );
}
