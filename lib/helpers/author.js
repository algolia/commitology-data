import { _, pMap } from 'golgoth';
import { absolute, exists, firostError, gitRoot, readJson } from 'firost';
import { repo } from '../../lib/config.js';
import { getCommit } from '../../lib/helpers/github.js';

export const inputPath = absolute(gitRoot(), 'data/input/authors.json');

/**
 * Iterates through each unique author from git commit history and executes a callback function for each one.
 * @param {Function} callback - Function to execute for each author, receives an object with name, email, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and execution
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback executions
 */
export async function forEachRepoAuthor(callback, options) {
  const rawLines = await repo.run("log --format='%an▮%ae'");
  const lines = _.chain(rawLines).split('\n').uniq().value();
  const max = lines.length;

  return await pMap(
    lines,
    async (line, index) => {
      const [name, email] = _.split(line, '▮');
      const data = { name, email };
      return await callback({ data, index, max });
    },
    options,
  );
}

/**
 * Retrieves GitHub user information from a commit author name by finding the most recent commit and extracting author details.
 * @param {string} authorName - The name of the commit author to search for
 * @returns {Promise<object>} The author object containing GitHub user information from the commit
 */
export async function getGitHubUserFromAuthorName(authorName) {
  const escapedName = _.chain(authorName)
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .value();
  const commitHash = await repo.run(
    `log --author="${escapedName}" --format="%H" -1`,
  );
  const commit = await getCommit(commitHash);
  return commit.author;
}

/**
 * Retrieves authors from the input file if it exists.
 * @returns {Promise<Array>} A promise that resolves to an array of authors, or an empty array if the input file doesn't exist
 */
export async function getInputAuthors() {
  if (!(await exists(inputPath))) {
    return [];
  }

  return await readJson(inputPath);
}

/**
 * Manually assigns a user ID to an author based on their email address
 * @param {object} author - The author object containing name and email
 * @param {string} author.name - The author's name
 * @param {string} author.email - The author's email address
 * @returns {string} The user ID associated with the author's email
 * @throws {Error} Throws COMMITOLOGY_AUTHOR_MISSING_USER_ID error if user ID is not found
 */
export function manuallyAssignId(author) {
  // Check https://api.github.com/users/{userName} to get the user id
  const GHOST_ID = 10137;
  const knownUserEmails = {
    // Algolia employees
    '127086@supinfo.com': 893837,
    'alexandre.stanislawski@algolia.com': 393765,
    'eunjae.lee@algolia.com': 499898,
    'jan.petr@algolia.com': 1058144,
    'jonas.badalic@algolia.com': 9317857,
    'karis612@gmail.com': 499898,
    'ronan.levesque@algolia.com': 2734671,
    'ronan.levesque@gmail.com': 2734671,
    'vincent.voyer@algolia.com': 123822,

    // Misc
    'gabin@hei.bi': 19300944,
    'github@diamondsea.com': 847589,
    'iam@chrisdeluca.me': 637174,
    'jsimonds@onshape.com': 7380810,
    'lawson@unreasonablegroup.com': 869491,
    'modulom@modulom.net': 2362139,
    'rhys@keylocation.sg': 6311784,
    'roger@fusionary.com': 193984,

    // Ghost
    'eunice.lee@algolia.com': GHOST_ID,
    'simon.schneeberger@ymc.ch': GHOST_ID,
  };

  const userId = knownUserEmails[author.email];
  if (!userId) {
    throw firostError(
      'COMMITOLOGY_AUTHOR_MISSING_USER_ID',
      `Cannot find user id for author ${author.name} / ${author.email}`,
    );
  }
  return userId;
}
