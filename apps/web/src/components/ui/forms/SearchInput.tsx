"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Called with the debounced (or instant) value */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Additional classes for the wrapper */
  className?: string;
  /** Input size variant */
  size?: "sm" | "default";
}

/**
 * Debounced search input with a clear button.
 * Delays calling `onChange` until the user stops typing for `debounceMs`.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 * <SearchInput value={query} onChange={setQuery} />
 * ```
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
  size = "default",
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState<string>(value);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onChange("");
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
        <Search className={cn(size === "sm" ? "size-3" : "size-3.5")} />
      </div>
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "pl-9 pr-9 border-border bg-card hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10",
          size === "sm" && "min-h-0 h-9 py-1 text-xs pl-8 pr-8",
        )}
        aria-label={placeholder}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 z-10 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className={cn(size === "sm" ? "size-3" : "size-3.5")} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
