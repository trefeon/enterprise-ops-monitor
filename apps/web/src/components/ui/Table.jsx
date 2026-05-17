import React from 'react';

export function Table({ children, className = '', wrapperClassName = '' }) {
  return (
    <div className={`overflow-x-auto ${wrapperClassName}`.trim()}>
      <table className={`table-base w-full ${className}`.trim()}>{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead>
      <tr className="table-head-row">{children}</tr>
    </thead>
  );
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>;
}

export function Trow({ children, className = '', onClick = null, ...props }) {
  return (
    <tr
      onClick={onClick || undefined}
      className={('table-row ' + (onClick ? 'cursor-pointer ' : '') + className).trim()}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Tcell({ as = 'td', children = null, className = '', ...props }) {
  /** @type {any} */
  const Tag = as;
  const base =
    as === 'th' ? 'table-cell font-medium text-muted-foreground' : 'table-cell text-foreground';

  return (
    <Tag className={`${base} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function TableFooter({ children, className = '' }) {
  return (
    <div
      className={(
        'border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row ' +
        'items-center justify-between gap-4 text-xs ' +
        className
      ).trim()}
    >
      {children}
    </div>
  );
}

export function TableEmpty({ colSpan, children = null, className = '' }) {
  return (
    <Trow>
      <Tcell
        colSpan={colSpan}
        className={`text-muted-foreground py-8 text-center ${className}`.trim()}
      >
        {children ?? 'No records found.'}
      </Tcell>
    </Trow>
  );
}
