import React from 'react';

/**
 * Button component
 * Variants: primary, secondary, quiet
 * 4px border radius, no drop shadows, 44px touch targets on phones
 */
export function Button({
  children,
  variant = 'secondary',
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-medium text-15 rounded-[4px] transition-colors ' +
    'min-h-[44px] sm:min-h-[36px] px-4 py-2 border select-none ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  let variantStyles = '';

  if (variant === 'primary') {
    variantStyles =
      'bg-brand text-white border-brand hover:bg-brand-hover active:bg-brand-hover disabled:hover:bg-brand';
  } else if (variant === 'secondary') {
    variantStyles =
      'bg-surface text-ink border-hairline hover:bg-paper active:bg-hairline/30 disabled:hover:bg-surface';
  } else if (variant === 'quiet') {
    variantStyles =
      'bg-transparent text-muted border-transparent hover:text-ink hover:bg-hairline/25 active:bg-hairline/40';
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

