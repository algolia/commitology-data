import { _, dayjs } from 'golgoth';
/**
 * Normalizes a date input to an object with timestamp and UTC components
 * @param {string|Date|number} rawDate - The raw date input to normalize (string, Date, or Unix timestamp in seconds)
 * @returns {object} An object with timestamp (Unix), year, month, day, hour, minute, second in UTC
 */
export function normalizeDate(rawDate) {
  // If it's a number, treat it as Unix timestamp in seconds
  const date = _.isNumber(rawDate)
    ? dayjs.unix(rawDate).utc()
    : dayjs(rawDate).utc();
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
