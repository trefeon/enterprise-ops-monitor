import React from 'react';
import { Progress } from './progress';

export default function ProgressBar({
  value = 0,
  className = '',
  trackClassName = '',
  barClassName = '',
}) {
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
