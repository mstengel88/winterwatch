import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PreviewLinkState = {
  actionLink: string;
  targetName: string;
  targetEmail: string;
};

interface PreviewLinkDialogProps {
  previewLink: PreviewLinkState | null;
  onCopy: () => void;
  onClose: () => void;
}

export default function PreviewLinkDialog({ previewLink, onCopy, onClose }: PreviewLinkDialogProps) {
  return (
    <Dialog open={Boolean(previewLink)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview User Account</DialogTitle>
          <DialogDescription>
            Use this one-time sign-in link to test the app as <span className="font-medium text-foreground">{previewLink?.targetName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-100">
            Recommended: open this link in an incognito window or a different browser profile.
            Opening it in your current browser session will switch you out of your admin account.
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="font-medium text-foreground">{previewLink?.targetName}</p>
            <p className="text-muted-foreground">{previewLink?.targetEmail}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">One-time preview link</p>
            <p className="break-all text-xs text-muted-foreground">{previewLink?.actionLink}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="gap-2" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => previewLink && window.open(previewLink.actionLink, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" />
            Open Preview Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
