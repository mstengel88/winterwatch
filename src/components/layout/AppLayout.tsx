import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { LocationBootstrap } from "@/components/LocationBootstrap";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background ios-page">
      <LocationBootstrap />
      <AppHeader />
      <main className="container px-4 py-5 pb-safe max-w-2xl mx-auto">
        {children}
      </main>
    </div>
  );
}
