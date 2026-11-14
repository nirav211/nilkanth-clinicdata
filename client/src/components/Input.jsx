import React, { forwardRef } from 'react';

/**
 * Input component
 * 4px border radius, 1px border hairline, 16px on mobile, 44px touch targets on mobile
 */
export const Input = forwardRef(function Input(
  {
    type = 'text',
    value,
    defaultValue,
    onChange,
    placeholder = '',
    disabled = false,
    readOnly = false,
    mono = false,
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
    'placeholder:text-muted/60 transition-colors ' +
    'focus:outline-none disabled:bg-paper disabled:text-muted disabled:cursor-not-allowed';

  const fontClass = mono ? 'font-mono' : 'font-sans';
  const borderClass = error
    ? 'border-red focus:border-red focus:ring-1 focus:ring-red'
    : 'border-hairline focus:border-brand focus:ring-1 focus:ring-brand';

  return (
    <input
      ref={ref}
      type={type}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={`${base} ${fontClass} ${borderClass} ${className}`}
      {...props}
    />
  );
});

export default Input;

