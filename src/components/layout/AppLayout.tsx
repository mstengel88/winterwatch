import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { LocationBootstrap } from "@/components/LocationBootstrap";
import { useNativePlatform } from "@/hooks/useNativePlatform";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  /** Use 'wide' for data-heavy pages like Reports and Work Logs */
  variant?: "default" | "wide";
}

export function AppLayout({ children, variant = "default" }: AppLayoutProps) {
  const { isNative } = useNativePlatform();

  return (
    <div
      className={cn(
        // Use dvh to avoid iOS viewport quirks
        "min-h-[100dvh] bg-background w-full max-w-full",
        // Keep any safe-area padding at the app level on iOS native
        isNative &&
          "[padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)] ios-page"
      )}
    >
      <LocationBootstrap />
      <AppHeader />

      <main
        className={cn(
          // IMPORTANT: avoid Tailwind `container` (can cause iOS width/offset issues)
          "mx-auto w-full max-w-full px-4 py-6",
          // Prevent children (tables/tabs) from forcing the whole page wider
          "min-w-0",
          // Keep the page from drifting horizontally; horizontal scroll should be inside specific sections (e.g., table wrapper)
          "overflow-x-hidden",
          variant === "wide" ? "max-w-[1400px]" : "max-w-6xl",
          isNative && "pb-safe"
        )}
      >
        {children}
      </main>
    </div>
  );
}
