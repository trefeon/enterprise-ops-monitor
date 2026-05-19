import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

const EmptyState = ({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon = <Inbox className="size-7" />,
  action = null,
}) => {
  return (
    <Card className="border-dashed bg-card">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
        <h3 className="mb-1 font-display text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
        {action && (
          <Button onClick={action.onClick}>
            {action.icon}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
