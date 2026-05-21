import { Progress } from '@/components/ui/progress';

export interface ProgressBarProps {
  value?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressBar({
  value = 0,
  className,
  trackClassName,
  barClassName,
}: ProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <Progress
      value={clamped}
      className={className}
      trackClassName={trackClassName}
      indicatorClassName={barClassName}
    />
  );
}

export default ProgressBar;
