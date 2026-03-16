import { normalizeDate } from './date.js';
import { normalizeReactions } from './reactions.js';

/**
 * Normalizes a comment object by extracting and transforming its properties
 * @param {object} inputComment - The raw comment object to normalize
 * @param {string} inputComment.body - The comment body text
 * @param {string|number} inputComment.id - The comment identifier
 * @param {string} inputComment.created_at - The comment creation timestamp
 * @param {object} inputComment.reactions - The comment reactions data
 * @param {object} inputComment.user - The user who created the comment
 * @returns {object} Normalized comment object with id, user, body, date, and reactions properties
 */
export function normalizeComment(inputComment) {
  const { body, id } = inputComment;
  const date = normalizeDate(inputComment.created_at);
  const reactions = normalizeReactions(inputComment.reactions);
  const user = inputComment.user.id;
  return {
    id,
    user,
    body,
    date,
    reactions,
  };
}
