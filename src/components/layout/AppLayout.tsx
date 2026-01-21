import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { LocationBootstrap } from "@/components/LocationBootstrap";

// inside your layout return:
<>
  <LocationBootstrap />
  {/* rest of layout */}
</>


interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6">
        {children}
      </main>
    </div>
  );
}
