import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { inputDirectory as issueInputDirectory } from './issue.js';
import { inputDirectory as pullInputDirectory } from './pull.js';

export const inputDirectory = absolute(gitRoot(), 'data/input/users');
export const outputDirectory = absolute(gitRoot(), 'data/output/users');
export const fieldOrder = {
  input: ['id', 'login', 'name', 'email', 'type', 'html_url', 'avatar_url'],
  output: ['id', 'login'],
};

/**
 * Iterates through all GitHub users found in issue and pull request JSON files and executes a callback for each one.
 * @param {Function} callback - Function to execute for each user file, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options to pass to the pMap function for controlling concurrency and other settings
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback executions
 */
export async function forEachGitHubUser(callback, options) {
  const issueFilepaths = await glob('./**/*.json', {
    cwd: issueInputDirectory,
  });
  const pullFilepaths = await glob('./**/*.json', { cwd: pullInputDirectory });
  const filepaths = [...issueFilepaths, ...pullFilepaths];
  const allItems = await pMap(filepaths, readJson);
  const userIds = _.chain(allItems).map('user.id').uniq().sort().value();
  // TODO: Also take ids from users

  const max = userIds.length;
  return await pMap(
    userIds,
    async (id, index) => {
      return await callback({ id, index, max });
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
export async function normalizeUser(rawUser) {
  const user = await getUser(rawUser);
  // const { avatar_url } = rawUser;
  // const avatar = _.split(avatar_url, '?')[0];
  // return {
  //   avatar,
  //   id: rawUser.id,
  //   login: rawUser.login,
  //   type: rawUser.type,
  // };
}

/**
 * Gets the absolute path for an input file based on the provided ID.
 * @param {string} id - The identifier used to construct the filename
 * @returns {string} The absolute path to the input JSON file
 */
export function getInputPath(id) {
  return absolute(inputDirectory, `${id}.json`);
}
/**
 * Gets the absolute output path for a file with the given ID
 * @param {string} id - The identifier used to generate the filename
 * @returns {string} The absolute path to the output JSON file
 */
export function getOutputPath(id) {
  return absolute(outputDirectory, `${id}.json`);
}
