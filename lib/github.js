import { env, readJsonUrl } from 'firost';
import { repoSlug } from './config.js';

export let __;

/**
 * Retrieves the total count of issues and pull requests for a GitHub repository.
 * @returns {Promise<number>} The total number of issues in the repository
 */
export async function getIssuesAndPullsCount() {
  const endpointUrl = `https://api.github.com/search/issues?q=repo:${repoSlug}&per_page=1`;
  const result = await readJsonUrl(endpointUrl, { headers: __.getHeaders() });
  return result.total_count;
}

/**
 * Retrieves GitHub issues and pull requests from a repository with pagination and retry logic
 * @param {object} [userOptions={}] - User configuration options for pagination
 * @param {number} [userOptions.page=1] - The page number to retrieve
 * @param {number} [userOptions.perPage=50] - The number of items per page
 * @returns {Promise<Array>} Array of issue objects from the GitHub API
 */
export async function getIssuesAndPulls(userOptions = {}) {
  const { page, perPage } = {
    page: 1,
    perPage: 50,
    ...userOptions,
  };
  const url = `https://api.github.com/repos/${repoSlug}/issues?state=all&per_page=${perPage}&page=${page}`;

  return await readJsonUrl(url, { headers: __.getHeaders() });
}

/**
 * Retrieves comments for a specific GitHub issue or pull request.
 * @param {string|number} itemNumber - The issue or pull request number
 * @returns {Promise<object>} A promise that resolves to the JSON response containing the comments data
 */
export async function getComments(itemNumber) {
  const url = `https://api.github.com/repos/${repoSlug}/issues/${itemNumber}/comments`;

  return await readJsonUrl(url, { headers: __.getHeaders() });
}

__ = {
  getHeaders() {
    const apiKey = env('GITHUB_TOKEN_COMMITOLOGY_DATA');
    if (!apiKey) return null;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.github+json',
    };
    return headers;
  },
};
