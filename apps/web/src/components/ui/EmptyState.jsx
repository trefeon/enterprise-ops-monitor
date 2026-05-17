import React from 'react';
import Button from './Button';

const EmptyState = ({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon = 'inbox',
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card border border-border rounded-lg border-dashed">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-muted-foreground text-2xl">{icon}</span>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="primary" icon={action.icon}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
