import React, { forwardRef } from 'react';

/**
 * Select component
 * 4px border radius, 1px border hairline, 16px on mobile, 44px touch targets on mobile
 */
export const Select = forwardRef(function Select(
  {
    value,
    defaultValue,
    onChange,
    children,
    disabled = false,
    error = false,
    className = '',
    id,
    name,
    ...props
  },
  ref
) {
  const base =
    'w-full bg-surface text-ink border rounded-[4px] px-3 py-2 ' +
    'min-h-[44px] sm:min-h-[36px] text-16 sm:text-15 leading-tight ' +
    'transition-colors focus:outline-none disabled:bg-paper disabled:text-muted disabled:cursor-not-allowed';

  const borderClass = error
    ? 'border-red focus:border-red focus:ring-1 focus:ring-red'
    : 'border-hairline focus:border-brand focus:ring-1 focus:ring-brand';

  return (
    <select
      ref={ref}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      disabled={disabled}
      className={`${base} ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;

