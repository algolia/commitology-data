import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { outputDirectory as issueOutputDirectory } from './issue.js';
import { outputDirectory as pullOutputDirectory } from './pull.js';

export const outputDirectory = absolute(gitRoot(), 'data/output/users');
export const fieldOrder = ['id', 'login'];

/**
 * Iterates through all GitHub users found in issue and pull request JSON files and executes a callback for each one.
 * @param {Function} callback - Function to execute for each user file, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options to pass to the pMap function for controlling concurrency and other settings
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback executions
 */
export async function forEachGitHubUser(callback, options) {
  // Check all issues and pulls and get a list of all users
  const issueFilepaths = await glob('./**/*.json', {
    cwd: issueOutputDirectory,
  });
  const pullFilepaths = await glob('./**/*.json', { cwd: pullOutputDirectory });
  const filepaths = [...issueFilepaths, ...pullFilepaths];
  const max = filepaths.length;

  return await pMap(
    filepaths,
    async (filepath, index) => {
      const data = await readJson(filepath);
      return await callback({ filepath, data, index, max });
    },
    options,
  );
}

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

/**
 *
 * @param user
 */
export function getOutputPath(user) {
  return absolute(outputDirectory, `${user.id}.json`);
}
