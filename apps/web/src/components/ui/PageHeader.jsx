import React from 'react';

const PageHeader = ({ title, subtitle, meta = null, actions = null, className = '' }) => {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div className="page-meta mt-1">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
