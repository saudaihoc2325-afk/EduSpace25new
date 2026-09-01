import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const base = 'bg-white rounded-2xl transition-all duration-150';

  const variantMap = {
    default: 'border border-slate-200 shadow-sm',
    elevated: 'border border-slate-100 shadow-md',
    bordered: 'border-2 border-slate-200',
    interactive:
      'border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer',
  };

  const paddingMap = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div className={`${base} ${variantMap[variant]} ${paddingMap[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};
