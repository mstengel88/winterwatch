import { lazy, ReactNode, Suspense } from "react";
import { useNativePlatform } from "@/hooks/useNativePlatform";
import { cn } from "@/lib/utils";

const AppHeader = lazy(async () => {
  const module = await import("./AppHeader");
  return { default: module.AppHeader };
});

interface AppLayoutProps {
  children: ReactNode;
  /** Use 'wide' for data-heavy pages like Reports and Work Logs */
  variant?: "default" | "wide";
}

export function AppLayout({ children, variant = "default" }: AppLayoutProps) {
  const { isNative, isIOS } = useNativePlatform();
  const headerFallback = <div className="h-16 border-b border-border/40 bg-card/95 md:h-14" />;

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
      <Suspense fallback={headerFallback}>
        <AppHeader />
      </Suspense>

      <main
        className={cn(
          // IMPORTANT: avoid Tailwind `container` (can cause iOS width/offset issues)
          "mx-auto w-full max-w-full px-4 py-4 sm:py-6",
          // Prevent children (tables/tabs) from forcing the whole page wider
          "min-w-0",
          // Keep the page from drifting horizontally; horizontal scroll should be inside specific sections (e.g., table wrapper)
          "overflow-x-hidden",
          variant === "wide" ? "max-w-[1400px]" : "max-w-6xl",
          isNative && "pb-safe",
          isIOS && "pb-ios-tabbar"
        )}
      >
        {children}
      </main>
    </div>
  );
}
