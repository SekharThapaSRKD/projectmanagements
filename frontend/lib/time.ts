'use client';

/**
 * Premium Time Utility
 * Ensures all timestamps are displayed in the user's local context 
 * while maintaining a consistent "System Ledger" aesthetic.
 */

export function formatGlobalTime(isoString: string, locale: string = 'en-US'): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

export function getRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}
