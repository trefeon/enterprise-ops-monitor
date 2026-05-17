import React from 'react';

export default function PageShell({ children, className = '' }) {
  return <div className={`page-container ${className}`.trim()}>{children}</div>;
}
