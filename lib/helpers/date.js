import { dayjs } from 'golgoth';
/**
 * Normalizes a date input to a Unix timestamp
 * @param {string|Date|number} rawDate - The raw date input to normalize
 * @returns {number} The Unix timestamp representation of the date
 */
export function normalizeDate(rawDate) {
  return dayjs(rawDate).unix();
}
