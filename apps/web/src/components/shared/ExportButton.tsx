import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function ExportButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Export Excel',
}: ExportButtonProps) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled || loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      <span className="truncate">{label}</span>
    </Button>
  );
}

export default ExportButton;
