import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface EntityAction {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  onSelect: () => void;
}

interface EntityActionMenuProps {
  actions: EntityAction[];
  label?: string;
}

export function EntityActionMenu({ actions, label = 'Open row actions' }: EntityActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" onClick={(event) => event.stopPropagation()}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">{label}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.variant}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              action.onSelect();
            }}
          >
            {action.icon}
            <span className="min-w-0 truncate">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EntityActionMenu;
