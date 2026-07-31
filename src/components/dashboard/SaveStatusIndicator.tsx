import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useCheckoutFormPersistence';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Storage issue</span>
        </>
      )}
    </div>
  );
}
