import { dayjs } from 'golgoth';

/**
 * Converts a Unix timestamp to a formatted date path string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string in YYYY/MM format
 */
export function datePath(timestamp) {
  return dayjs.unix(timestamp).format('YYYY/MM');
}
