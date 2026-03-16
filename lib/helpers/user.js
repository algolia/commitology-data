import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { inputPath as authorInputPath } from './author.js';
import { inputDirectory as commentInputDirectory } from './comment.js';
import { inputDirectory as issueInputDirectory } from './issue.js';
import { inputDirectory as pullInputDirectory } from './pull.js';

export const inputDirectory = absolute(gitRoot(), 'data/input/users');
export const outputDirectory = absolute(gitRoot(), 'data/output/users');
export const fieldOrder = {
  input: ['id', 'login', 'name', 'email', 'type', 'html_url', 'avatar_url'],
  output: ['id', 'login'],
};

/**
 * Iterates through all unique user IDs from issues, pull requests, comments, and authors, executing a callback for each user.
 * @param {Function} callback - Function to execute for each user, receives an object with id, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and other settings
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback function
 */
export async function forEachInputUser(callback, options) {
  // All users from issues and pull requests
  const issueFilepaths = await glob('./**/*.json', {
    cwd: issueInputDirectory,
  });
  const pullFilepaths = await glob('./**/*.json', { cwd: pullInputDirectory });
  const issuesAndPullRequests = await pMap(
    [...issueFilepaths, ...pullFilepaths],
    readJson,
  );
  const issuesAndPullRequestsUserIds = _.chain(issuesAndPullRequests)
    .map('user.id')
    .uniq()
    .sort()
    .value();

  // All users from comments
  const commentsFilepaths = await glob('./**/*.json', {
    cwd: commentInputDirectory,
  });
  const comments = await pMap(commentsFilepaths, readJson);
  const commentsUserIds = _.chain(comments)
    .flatten()
    .map('user.id')
    .uniq()
    .sort()
    .value();

  // All users from authors
  const authors = await readJson(authorInputPath);
  const authorUserIds = _.chain(authors)
    .map('id')
    .uniq()
    .filter((id) => id !== -1)
    .sort()
    .value();

  const userIds = _.chain([
    ...issuesAndPullRequestsUserIds,
    ...commentsUserIds,
    ...authorUserIds,
  ])
    .uniq()
    .sort()
    .value();

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
