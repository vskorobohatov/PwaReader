import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  fullWidth?: boolean;
}

export default function Button({
  variant = 'default',
  fullWidth = false,
  className = '',
  disabled = false,
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-medium rounded-lg transition-colors text-sm py-1 px-2';

  const variantClasses: Record<string, string> = {
    default:
      'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50',
    outline:
      'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}