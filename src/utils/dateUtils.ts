/**
 * Date and relative elapsed time formatting utilities for ISEZERANO ONLINE.
 * Safe against invalid or missing timestamps without inventing fake dates.
 */

export interface FormattedDateInfo {
  formattedDate: string; // e.g., "Oct 20, 2026"
  formattedDateFull: string; // e.g., "October 20, 2026"
  formattedTime: string; // e.g., "8:00 AM"
  relativeTime: string; // e.g., "2 hours ago", "3 days ago"
  displayCombined: string; // e.g., "Oct 20, 2026 • 2 hours ago"
}

export const isValidDateString = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string' || !val.trim()) return false;
  const parsed = new Date(val);
  return !isNaN(parsed.getTime());
};

/**
 * Returns relative time string from an ISO date string (e.g. "2 hours ago", "3 days ago").
 */
export const getRelativeTime = (isoString?: string | null): string => {
  if (!isValidDateString(isoString)) return '';

  const date = new Date(isoString!);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Parses and formats a publication timestamp into accurate date, time, and relative elapsed time.
 * Returns null if timestamp is missing or invalid so caller can handle gracefully.
 */
export const formatPublicationDate = (isoString?: string | null): FormattedDateInfo | null => {
  if (!isValidDateString(isoString)) {
    return null;
  }

  try {
    const date = new Date(isoString!);
    const relativeTime = getRelativeTime(isoString);

    const formattedDate = date.toLocaleDateString('en-RW', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedDateFull = date.toLocaleDateString('en-RW', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedTime = date.toLocaleTimeString('en-RW', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const displayCombined = relativeTime 
      ? `${formattedDate} (${relativeTime})`
      : formattedDate;

    return {
      formattedDate,
      formattedDateFull,
      formattedTime,
      relativeTime,
      displayCombined
    };
  } catch {
    return null;
  }
};
