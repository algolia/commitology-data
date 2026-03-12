import { _ } from 'golgoth';
/**
 * Normalizes a raw user object by mapping properties to a standardized format.
 * @param {object} rawUser - The raw user object to normalize
 * @param {string} rawUser.avatar_url - The user's avatar URL
 * @param {number|string} rawUser.id - The user's unique identifier
 * @param {string} rawUser.login - The user's login name
 * @param {string} rawUser.type - The user's account type
 * @returns {object} The normalized user object with avatar, id, login, and type properties
 */
export function normalizeUser(rawUser) {
  const { avatar_url } = rawUser;
  const avatar = _.split(avatar_url, '?')[0];
  return {
    avatar,
    id: rawUser.id,
    login: rawUser.login,
    type: rawUser.type,
  };
}
