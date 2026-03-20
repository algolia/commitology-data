import { _ } from 'golgoth';
import { consoleWarn, env, readJsonUrl, sleep } from 'firost';
import { repoSlug } from '../config.js';

export let __;

/**
 * Retrieves the total count of issues and pull requests for a GitHub repository.
 * @returns {Promise<number>} The total number of issues in the repository
 */
export async function getIssuesAndPullsCount() {
  const result = await __.apiCall(
    `https://api.github.com/search/issues?q=repo:${repoSlug}&per_page=1`,
  );
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

  return await __.apiCall(url);
}

/**
 * Recursively fetches all comments for a GitHub issue with pagination support
 * @param {number} itemNumber - The GitHub issue number to fetch comments for
 * @param {number} [pageNumber=1] - The page number to start fetching from
 * @returns {Promise<Array>} A promise that resolves to an array of all comments for the issue
 */
export async function getComments(itemNumber, pageNumber = 1) {
  const comments = await __.apiCall(
    `https://api.github.com/repos/${repoSlug}/issues/${itemNumber}/comments?per_page=100&page=${pageNumber}`,
  );
  if (comments.length !== 100) {
    return comments;
  }
  const nextPageComment = await getComments(itemNumber, pageNumber + 1);
  return [...comments, ...nextPageComment];
}

/**
 * Retrieves reviews for a specific pull request from GitHub API
 * @param {number} pullNumber - The pull request number to get reviews for
 * @returns {Promise<object>} Promise that resolves to the JSON response containing pull request reviews
 */
export async function getReviews(pullNumber) {
  return await __.apiCall(
    `https://api.github.com/repos/${repoSlug}/pulls/${pullNumber}/comments`,
  );
}

/**
 * Retrieves commit information from GitHub API for a specific commit hash
 * @param {string} commitHash - The SHA hash of the commit to retrieve
 * @returns {Promise<object>} A promise that resolves to the commit data from GitHub API
 */
export async function getCommit(commitHash) {
  return await __.apiCall(
    `https://api.github.com/repos/${repoSlug}/commits/${commitHash}`,
  );
}

/**
 * Retrieves user information from the GitHub API
 * @param {string|number} userId - The GitHub user ID to fetch
 * @returns {Promise<object>} A promise that resolves to the user data object
 */
export async function getUser(userId) {
  const url = `https://api.github.com/user/${userId}`;
  return await __.apiCall(url);
}

/**
 * Retrieves detailed pull request information from the GitHub API
 * @param {number} pullNumber - The pull request number to fetch
 * @returns {Promise<object>} A promise that resolves to the detailed pull request data including changed_files, additions, and deletions
 */
export async function getPullRequestDetails(pullNumber) {
  const url = `https://api.github.com/repos/${repoSlug}/pulls/${pullNumber}`;
  return await __.apiCall(url);
}

__ = {
  /**
   * Makes an API call to the specified URL with automatic retry logic for certain error types
   * @param {string} url - The URL to make the API call to
   * @param {number} [retryCount=0] - The current retry attempt count
   * @returns {Promise<object>} A promise that resolves to the JSON response from the API
   */
  async apiCall(url, retryCount = 0) {
    await __.randomWait(1000);
    const retryableErrors = ['FIROST_READ_JSON_URL_HTTP_502'];
    try {
      return await readJsonUrl(url, { headers: __.getHeaders() });
    } catch (err) {
      if (_.includes(retryableErrors, err.code)) {
        consoleWarn('Retrying failed call');
        // If we retried enough times, we fail for real
        if (retryCount >= 3) {
          throw err;
        }
        await __.randomWait(2000);
        return await __.apiCall(url, retryCount + 1);
      }

      throw err;
    }
  },
  async randomWait(baseTime = 1000) {
    const randomDelay = Math.floor(Math.random() * 150) + 50; // 50-200ms random
    await sleep(baseTime + randomDelay);
  },
  /**
   * Generates HTTP headers for GitHub API requests with authentication
   * @returns {object | null} Headers object with Authorization and Accept properties, or null if no API key is found
   */
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
