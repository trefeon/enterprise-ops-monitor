import type { ComponentType, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BaseActionMenuItem {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

export interface BaseActionMenuProps {
  items: BaseActionMenuItem[];
  label?: string;
  title?: ReactNode;
}

export function BaseActionMenu({ items, label = "Open actions", title }: BaseActionMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" onClick={(event) => event.stopPropagation()}>
            <MoreHorizontal />
            <span className="sr-only">{label}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              {item.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={item.disabled}
                variant={item.destructive ? "destructive" : "default"}
                onClick={(event) => {
                  event.stopPropagation();
                  item.onSelect();
                }}
              >
                {Icon && <Icon className="size-4" />}
                <span className="min-w-0 truncate">{item.label}</span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
