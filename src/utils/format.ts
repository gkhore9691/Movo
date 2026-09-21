import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return `₹${formatted}`;
}

export function formatDate(date: Date | string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy');
}

export function formatRelativeDate(date: Date | string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) return '—';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const num = digits.slice(2);
    return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

export function todayAt(hours: number, minutes: number = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return format(d, 'yyyy-MM-dd');
}
