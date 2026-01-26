import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { LocationBootstrap } from "@/components/LocationBootstrap";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <LocationBootstrap />
      <AppHeader />
      <main className="container px-4 py-6 mx-auto max-w-6xl">
        {children}
      </main>
    </div>
  );
}
