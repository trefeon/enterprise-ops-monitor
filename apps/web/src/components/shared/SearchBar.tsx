import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, ChangeEvent } from 'react';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

export function SearchBar({
  value,
  onValueChange,
  onChange,
  placeholder = 'Search...',
  className,
  ...props
}: SearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
        <Search className="size-3.5" />
      </div>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn('pl-11', className)}
        {...props}
      />
    </div>
  );
}
