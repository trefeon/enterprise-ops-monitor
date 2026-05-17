import React from 'react';

export default function ProgressBar({
  value = 0,
  className = '',
  trackClassName = '',
  barClassName = '',
}) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div
      className={`w-full bg-secondary rounded-full h-2 overflow-hidden ${trackClassName} ${className}`.trim()}
    >
      <div
        className={`bg-brand h-2 rounded-full transition-all duration-500 ${barClassName}`.trim()}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
