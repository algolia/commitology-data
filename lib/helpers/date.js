import { dayjs } from 'golgoth';
/**
 * Normalizes a date input to an object with timestamp and UTC components
 * @param {string|Date|number} rawDate - The raw date input to normalize
 * @returns {object} An object with timestamp (Unix), year, month, day, hour, minute, second in UTC
 */
export function normalizeDate(rawDate) {
  const date = dayjs(rawDate).utc();
  return {
    timestamp: date.unix(),
    year: date.year(),
    month: date.month() + 1,
    day: date.date(),
    hour: date.hour(),
    minute: date.minute(),
    second: date.second(),
  };
}
