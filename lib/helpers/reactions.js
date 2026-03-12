import { _ } from 'golgoth';
/**
 * Normalizes raw reaction data by mapping reaction types to a standardized format
 * @param {object} rawReactions - Raw reaction data object containing reaction counts
 * @returns {object} Normalized reaction object with standardized property names
 */
export function normalizeReactions(rawReactions) {
  const allowedReactions = {
    confused: '😕',
    eyes: '👀',
    heart: '❤️',
    hooray: '🎉',
    laugh: '😄',
    '-1': '👎️',
    '+1': '👍️',
    rocket: '🚀',
  };
  const reactions = {};
  _.each(allowedReactions, (reactionEmoji, reactionName) => {
    const reactionCount = rawReactions[reactionName];
    if (!reactionCount) {
      return;
    }
    reactions[reactionEmoji] = reactionCount;
  });
  return reactions;
}
