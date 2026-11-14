import React from 'react';

/**
 * EmptyState component
 * Plain, friendly receptionist tone. No illustrations, no emoji.
 */
export function EmptyState({
  title,
  description,
  action,
  className = ''
}) {
  return (
    <div
      className={`border border-hairline border-dashed rounded-[6px] p-8 text-center bg-surface/50 max-w-lg mx-auto ${className}`}
    >
      {title && (
        <h3 className="text-17 font-medium text-ink mb-1">
          {title}
        </h3>
      )}
      <p className="text-15 text-muted leading-normal">
        {description}
      </p>
      {action && (
        <div className="mt-4 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;

