import React from 'react';

const PageHeader = ({ title, subtitle, meta = null, actions = null, className = '' }) => {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div className="page-meta mt-1">{meta}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
