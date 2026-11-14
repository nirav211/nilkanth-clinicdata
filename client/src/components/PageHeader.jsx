import React from 'react';

/**
 * PageHeader component
 * Clean printed ledger style header with title, descriptive subtitle, and actions slot.
 */
export function PageHeader({
  title,
  subtitle,
  actions = null,
  className = ''
}) {
  return (
    <div className={`pb-4 border-b border-hairline mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${className}`}>
      <div>
        <h1 className="text-22 sm:text-28 font-semibold text-ink tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-15 text-muted mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;

