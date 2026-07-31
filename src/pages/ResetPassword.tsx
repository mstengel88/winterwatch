import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicButton, PublicLabel } from '@/components/public/PublicUI';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null); // null = checking
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      // Give Supabase a moment to process the hash fragment from the URL
      // The hash contains the recovery token that Supabase automatically processes
      
      // First, check if we have a recovery hash in the URL
      const hasRecoveryHash = window.location.hash.includes('type=recovery');
      
      if (hasRecoveryHash) {
        // Supabase should automatically process the hash and establish a session
        // Wait a bit for onAuthStateChange to fire with the recovery event
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Now check for an active session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (error) {
        console.error('Error checking session:', error);
        setIsValidToken(false);
        setIsCheckingSession(false);
        return;
      }

      // If we have a session, the user can reset their password
      if (session) {
        setIsValidToken(true);
      } else {
        // No session and no recovery hash means invalid/expired link
        setIsValidToken(false);
      }
      
      setIsCheckingSession(false);
    };

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        // This event fires when Supabase processes the recovery token
        setIsValidToken(true);
        setIsCheckingSession(false);
      }
    });

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validateForm = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Password Updated',
          description: 'Your password has been successfully reset. You can now sign in.',
        });
        
        // Sign out and redirect to login
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking session
  if (isCheckingSession || isValidToken === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </main>
    );
  }

  if (!isValidToken) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md bg-card/50 border-border/50">
          <CardContent className="pt-6 text-center">
            <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid or Expired Link</h2>
            <p className="text-muted-foreground mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <PublicButton className="w-full mb-3">
                Request New Link
              </PublicButton>
            </Link>
            <Link to="/auth">
              <PublicButton variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </PublicButton>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-muted to-card border-4 border-border shadow-lg">
          <KeyRound className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
        <p className="text-muted-foreground">Enter your new password</p>
      </div>

      <Card className="w-full max-w-md bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <PublicLabel htmlFor="password" className="text-foreground">New Password</PublicLabel>
              <div className="relative">
                <Input
                  id="password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
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
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <PublicLabel htmlFor="confirmPassword" className="text-foreground">Confirm Password</PublicLabel>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="bg-muted/50 border-border/50 pr-10"
                />
                <PublicButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </PublicButton>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <PublicButton type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset Password
            </PublicButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
