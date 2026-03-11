import { dayjs } from 'golgoth';

/**
 * Converts a Unix timestamp to a formatted date path string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string in YYYY/MM format
 */
export function datePath(timestamp) {
  return dayjs.unix(timestamp).format('YYYY/MM');
}

/**
 * Determines if a hex color is considered dark based on its luminance value.
 * @param {string} hexColor - The hex color code (with or without # prefix)
 * @returns {boolean} True if the color is dark (luminance <= 0.5), false otherwise
 */
export function isDarkColor(hexColor) {
  const hex = hexColor.replace('#', '');

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance <= 0.5;
}
