import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { LocationBootstrap } from "@/components/LocationBootstrap";
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  /** Use 'wide' for data-heavy pages like Reports and Work Logs */
  variant?: 'default' | 'wide';
}

export function AppLayout({ children, variant = 'default' }: AppLayoutProps) {
  const { isNative } = useNativePlatform();

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isNative && "ios-page"
    )}>
      <LocationBootstrap />
      <AppHeader />
      <main className={cn(
        "container px-4 py-6 mx-auto",
        variant === 'wide' ? "max-w-[1400px]" : "max-w-6xl",
        isNative && "pb-safe"
      )}>
        {children}
      </main>
    </div>
  );
}
