import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/shared/DatePicker';
import { BRANCH_OPTIONS, STATUS_OPTIONS } from '../columns';
import type { EODFilters as EODFiltersType } from '../types';

interface EODFiltersProps {
  filters: EODFiltersType;
  onFilterChange: (e: { target: { name: string; value: string } }) => void;
}

export function EODFilters({ filters, onFilterChange }: EODFiltersProps) {
  return (
    <>
      <Select
        value={filters.areaId ? String(filters.areaId) : ''}
        onValueChange={(val) =>
          onFilterChange({ target: { name: 'areaId', value: String(val ?? '') } })
        }
      >
        <SelectTrigger className="w-full lg:w-44">
          <SelectValue placeholder="Branch: All">
            {filters.areaId
              ? `Branch: ${BRANCH_OPTIONS.find((b) => String(b.id) === String(filters.areaId))?.label || filters.areaId}`
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Branch: All</SelectItem>
          {BRANCH_OPTIONS.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status}
        onValueChange={(val) =>
          onFilterChange({ target: { name: 'status', value: String(val ?? '') } })
        }
      >
        <SelectTrigger className="w-full lg:w-40">
          <SelectValue placeholder="Status: All">
            {filters.status
              ? `Status: ${STATUS_OPTIONS.find((s) => s.value === filters.status)?.label || filters.status.toUpperCase()}`
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePicker
        name="date"
        value={filters.date}
        onChange={onFilterChange}
        className="w-full shrink-0 lg:w-auto"
      />
    </>
  );
}
