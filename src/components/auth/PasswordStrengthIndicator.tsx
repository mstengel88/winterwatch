import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'At least 6 characters', test: (p) => p.length >= 6 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { strength, passedCount } = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password));
    const count = passed.length;
    
    let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (count >= 5) level = 'strong';
    else if (count >= 4) level = 'good';
    else if (count >= 2) level = 'fair';
    
    return { strength: level, passedCount: count };
  }, [password]);

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength === 'weak' && 'text-destructive',
            strength === 'fair' && 'text-orange-500',
            strength === 'good' && 'text-yellow-500',
            strength === 'strong' && 'text-green-500'
          )}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strengthColors[strength])}
            style={{ width: `${(passedCount / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <li key={req.label} className="flex items-center gap-2 text-xs">
              {passed ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={cn(
                passed ? 'text-green-500' : 'text-muted-foreground'
              )}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
