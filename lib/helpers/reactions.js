import { _ } from 'golgoth';
/**
 * Returns reactions data as-is from the API without any transformation
 * @param {object} rawReactions - Raw reaction data object containing reaction counts
 * @returns {object} Reaction object with original keys from GitHub API (e.g., '+1', '-1', 'heart')
 */
export function normalizeReactions(rawReactions) {
  // Filter out reactions with 0 count and keep only non-zero values
  return _.pickBy(rawReactions, (count) => count > 0);
}
