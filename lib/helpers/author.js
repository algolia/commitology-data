import { _, pMap } from 'golgoth';
import { absolute, gitRoot } from 'firost';
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
