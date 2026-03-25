import { consoleWarn, env, readJsonUrl, sleep } from 'firost';
import Bottleneck from 'bottleneck';
import { repoSlug } from '../config.js';

// GitHub API rate limits: Search API 30 req/min, REST API 5000 req/hour
const searchLimiter = new Bottleneck({ minTime: 2000 });
const restLimiter = new Bottleneck({ minTime: 1000 });

export let __;

/**
 * Retrieves the oldest issue from the repository
 * @returns {Promise<object|null>} The oldest issue object or null if no issues exist
 */
export async function getOldestIssue() {
  return await __.getOldestIssueOrPull('issue');
}

/**
 * Retrieves GitHub issues (excluding pull requests) using the Search API
 * @param {object} [options={}] - Configuration options for pagination and filtering
 * @param {number} [options.page=1] - The page number to retrieve
 * @param {number} [options.perPage=100] - The number of items per page (max 100 for search API)
 * @param {string} [options.dateRange] - Optional date range filter (e.g., "2024-01-01..2024-12-31")
 * @returns {Promise<Array>} Array of issue objects from the GitHub API, or empty array if pagination limit reached
 */
export async function getIssues(options = {}) {
  return await __.getIssuesOrPulls('issue', options);
}

/**
 * Retrieves the oldest pull request from the repository
 * @returns {Promise<object|null>} The oldest pull request object or null if no pull requests exist
 */
export async function getOldestPull() {
  return await __.getOldestIssueOrPull('pr');
}

/**
 * Retrieves GitHub pull requests (excluding issues) using the Search API
 * @param {object} [options={}] - Configuration options for pagination and filtering
 * @param {number} [options.page=1] - The page number to retrieve
 * @param {number} [options.perPage=100] - The number of items per page (max 100 for search API)
 * @param {string} [options.dateRange] - Optional date range filter (e.g., "2024-01-01..2024-12-31")
 * @returns {Promise<Array>} Array of pull request objects from the GitHub API, or empty array if pagination limit reached
 */
export async function getPulls(options = {}) {
  return await __.getIssuesOrPulls('pr', options);
}

/**
 * Recursively fetches all comments for a GitHub issue with pagination support
 * @param {number} itemNumber - The GitHub issue number to fetch comments for
 * @param {number} [pageNumber=1] - The page number to start fetching from
 * @returns {Promise<Array>} A promise that resolves to an array of all comments for the issue
 */
export async function getComments(itemNumber, pageNumber = 1) {
  const path = `/repos/${repoSlug}/issues/${itemNumber}/comments?per_page=100&page=${pageNumber}`;
  const comments = await __.apiCall(path);
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
  return await __.apiCall(`/repos/${repoSlug}/pulls/${pullNumber}/comments`);
}

/**
 * Retrieves commit information from GitHub API for a specific commit hash
 * @param {string} commitHash - The SHA hash of the commit to retrieve
 * @returns {Promise<object>} A promise that resolves to the commit data from GitHub API
 */
export async function getCommit(commitHash) {
  return await __.apiCall(`/repos/${repoSlug}/commits/${commitHash}`);
}

/**
 * Retrieves user information from the GitHub API
 * @param {string|number} userId - The GitHub user ID to fetch
 * @returns {Promise<object>} A promise that resolves to the user data object
 */
export async function getUser(userId) {
  return await __.apiCall(`/user/${userId}`);
}

/**
 * Retrieves detailed pull request information from the GitHub API
 * @param {number} pullNumber - The pull request number to fetch
 * @returns {Promise<object>} A promise that resolves to the detailed pull request data including changed_files, additions, and deletions
 */
export async function getPullRequestDetails(pullNumber) {
  return await __.apiCall(`/repos/${repoSlug}/pulls/${pullNumber}`);
}

__ = {
  /**
   * Retrieves issues or pull requests using the Search API
   * @param {string} type - Either 'issue' or 'pr'
   * @param {object} [options={}] - Configuration options
   * @returns {Promise<Array>} Array of items from the GitHub API, or empty array if pagination limit reached
   */
  async getIssuesOrPulls(type, options = {}) {
    const { page = 1, perPage = 100, dateRange } = options;

    let query = `repo:${repoSlug}+type:${type}`;
    if (dateRange) {
      query += `+created:${dateRange}`;
    }

    const path = `/search/issues?q=${query}&sort=updated&order=desc&per_page=${perPage}&page=${page}`;

    try {
      const result = await __.apiCall(path);
      return result.items;
    } catch (err) {
      if (err.code === 'FIROST_READ_JSON_URL_HTTP_422') {
        return [];
      }
      throw err;
    }
  },

  /**
   * Retrieves the oldest issue or pull request from the repository
   * @param {string} type - Either 'issue' or 'pr'
   * @returns {Promise<object|null>} The oldest item or null if none exist
   */
  async getOldestIssueOrPull(type) {
    const path = `/search/issues?q=repo:${repoSlug}+type:${type}&sort=created&order=asc&per_page=1`;
    const result = await __.apiCall(path);
    return result.items[0] || null;
  },

  /**
   * Makes an API call to the specified path with automatic retry logic and rate limiting
   * @param {string} path - The API path (e.g., "/search/issues?q=...")
   * @param {number} [retryCount=0] - The current retry attempt count
   * @returns {Promise<object>} A promise that resolves to the JSON response from the API
   */
  async apiCall(path, retryCount = 0) {
    const url = `https://api.github.com${path}`;
    const limiter = path.includes('/search/') ? searchLimiter : restLimiter;

    let headers = null;
    const apiKey = env('GITHUB_TOKEN_COMMITOLOGY_DATA');
    if (apiKey) {
      headers = {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.github+json',
      };
    }

    return await limiter.schedule(async () => {
      try {
        return await readJsonUrl(url, { headers });
      } catch (err) {
        // Retry on 502 Bad Gateway (temporary GitHub server issues)
        if (err.code === 'FIROST_READ_JSON_URL_HTTP_502') {
          consoleWarn('Retrying failed call');
          if (retryCount >= 3) {
            throw err;
          }
          await sleep(3000);
          return await __.apiCall(path, retryCount + 1);
        }
        throw err;
      }
    });
  },
};
