import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function calculateOverdueDays(dueDateStr: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDateStr: string | Date): boolean {
  return calculateOverdueDays(dueDateStr) > 0;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + 's'}`;
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    available: 'badge-available',
    active: 'badge-issued',
    issued: 'badge-issued',
    overdue: 'badge-overdue',
    damaged: 'badge-damaged',
    maintenance: 'badge-maintenance',
    pending: 'badge-pending',
    returned: 'badge-returned',
    partially_returned: 'badge-issued',
    good: 'badge-available',
    lost: 'badge-overdue',
    approved: 'badge-available',
    rejected: 'badge-overdue',
  };
  return map[status] || 'badge-returned';
}
