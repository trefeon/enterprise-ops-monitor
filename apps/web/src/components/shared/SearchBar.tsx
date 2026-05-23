import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, ChangeEvent } from 'react';

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'default';
  containerClassName?: string;
}

export function SearchBar({
  value,
  onValueChange,
  onChange,
  placeholder = 'Search...',
  className,
  containerClassName,
  size = 'default',
  ...props
}: SearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <div className={cn('relative w-full min-w-0', containerClassName)}>
      <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
        <Search className={cn(size === 'sm' ? 'size-3' : 'size-3.5')} />
      </div>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'pl-9 border-border bg-card hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10',
          size === 'sm' && 'min-h-0 h-9 py-1 text-xs pl-8',
          className
        )}
        {...props}
      />
    </div>
  );
}

export default SearchBar;
