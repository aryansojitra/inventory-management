import React from 'react';
import { cn, getStatusBadgeClass } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'available'
    | 'issued'
    | 'overdue'
    | 'damaged'
    | 'maintenance'
    | 'pending'
    | 'returned'
    | 'outline';
  status?: string;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant, status, children, ...props }) => {
  let badgeStyle = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide';

  if (status) {
    badgeStyle = cn(badgeStyle, getStatusBadgeClass(status));
  } else if (variant === 'available') {
    badgeStyle = cn(badgeStyle, 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800');
  } else if (variant === 'issued') {
    badgeStyle = cn(badgeStyle, 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800');
  } else if (variant === 'overdue') {
    badgeStyle = cn(badgeStyle, 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800');
  } else if (variant === 'damaged') {
    badgeStyle = cn(badgeStyle, 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800');
  } else if (variant === 'maintenance') {
    badgeStyle = cn(badgeStyle, 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800');
  } else if (variant === 'pending') {
    badgeStyle = cn(badgeStyle, 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800');
  } else if (variant === 'returned') {
    badgeStyle = cn(badgeStyle, 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700');
  } else if (variant === 'outline') {
    badgeStyle = cn(badgeStyle, 'border border-border text-foreground bg-transparent');
  } else {
    badgeStyle = cn(badgeStyle, 'bg-secondary text-secondary-foreground');
  }

  return (
    <span className={cn(badgeStyle, className)} {...props}>
      {children}
    </span>
  );
};
