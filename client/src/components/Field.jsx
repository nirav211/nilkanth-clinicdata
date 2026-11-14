import React from 'react';

/**
 * Field component
 * Provides sentence-case label, control input, help text, and error message
 */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = ''
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={htmlFor}
            className="text-13 font-medium text-ink flex items-center gap-1"
          >
            {label}
            {required && <span className="text-red font-mono" title="Required">*</span>}
          </label>
          {hint && !error && (
            <span className="text-13 text-muted">{hint}</span>
          )}
        </div>
      )}

      {children}

      {error && (
        <p className="text-13 text-red font-medium mt-0.5 leading-snug">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;

