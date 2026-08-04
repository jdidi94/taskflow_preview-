/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Handle special cases
    if (date === 'Never' || !date || date.trim() === '') {
      return 'Unknown';
    }
    
    // Try to parse the date string (ISO strings are most reliable)
    const parsed = new Date(date);
    
    // Check if the date is valid
    if (isNaN(parsed.getTime())) {
      // If parsing fails, try to handle common formats
      if (date.includes('/')) {
        // Handle MM/DD/YYYY format (fallback for old data)
        const parts = date.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1; // Month is 0-indexed
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          dateObj = new Date(year, month, day);
        } else {
          return 'Invalid Date';
        }
      } else {
        return 'Invalid Date';
      }
    } else {
      dateObj = parsed;
    }
  } else {
    dateObj = date;
  }
  
  // Final validation
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  return formatDate(dateObj);
}
