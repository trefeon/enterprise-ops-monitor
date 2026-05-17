import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Terminal } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const INSTALL_COMMAND = 'iex (irm https://agents.lmntea.fun/install)';

export function DownloadDialog({ open, onClose }: Props) {
  const copyCommand = () => {
    navigator.clipboard.writeText(INSTALL_COMMAND);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Install Office Agent</DialogTitle>
          <DialogDescription>
            Run this PowerShell command on the target machine to install the monitoring agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4 font-mono text-sm relative">
            <code>{INSTALL_COMMAND}</code>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={copyCommand}
            >
              <Copy className="size-4" />
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <Terminal className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Prerequisites</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Windows 10/11 Pro (64-bit)</li>
                <li>PowerShell 5.1 or later</li>
                <li>Internet access to agents.lmntea.fun</li>
                <li>Run as Administrator</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
