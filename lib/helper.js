import { dayjs } from 'golgoth';

/**
 * Converts a normalized date object to a formatted date path string
 * @param {object} date - Normalized date object with timestamp property
 * @returns {string} Formatted date string in YYYY/MM format
 */
export function datePath(date) {
  return dayjs.unix(date.timestamp).format('YYYY/MM');
}
