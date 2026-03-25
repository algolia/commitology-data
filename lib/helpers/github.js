import { _ } from 'golgoth';
import { consoleWarn, env, readJsonUrl } from 'firost';
import Bottleneck from 'bottleneck';
import { repoSlug } from '../config.js';

// GitHub API rate limits:
// - Search API: 30 requests/minute = 1 request every 2000ms
// - REST API: 5000 requests/hour = 1 request every 720ms (using 1000ms for safety)
const SEARCH_API_MIN_TIME = 2000;
const REST_API_MIN_TIME = 1000;

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
 * Retrieves GitHub issues (excluding pull requests) using the Search API
 * @param {object} [options={}] - Configuration options for pagination and filtering
 * @param {number} [options.page=1] - The page number to retrieve
 * @param {number} [options.perPage=100] - The number of items per page (max 100 for search API)
 * @param {string} [options.dateRange] - Optional date range filter (e.g., "2024-01-01..2024-12-31")
 * @returns {Promise<Array>} Array of issue objects from the GitHub API, or empty array if pagination limit reached
 */
export async function getIssues(options = {}) {
  const { page = 1, perPage = 100, dateRange } = options;

  let query = `repo:${repoSlug}+type:issue`;
  if (dateRange) {
    query += `+created:${dateRange}`;
  }

  const url = `https://api.github.com/search/issues?q=${query}&sort=created&order=desc&per_page=${perPage}&page=${page}`;

  try {
    const result = await __.apiCall(url);
    return result.items;
  } catch (err) {
    // GitHub Search API returns 422 when pagination limit is exceeded
    if (err.code === 'FIROST_READ_JSON_URL_HTTP_422') {
      return [];
    }
    throw err;
  }
}

/**
 * Retrieves the oldest issue from the repository
 * @returns {Promise<object|null>} The oldest issue object or null if no issues exist
 */
export async function getOldestIssue() {
  const url = `https://api.github.com/search/issues?q=repo:${repoSlug}+type:issue&sort=created&order=asc&per_page=1`;
  const result = await __.apiCall(url);
  return result.items[0] || null;
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
   * Cached Bottleneck limiter for Search API calls
   */
  searchLimiter: null,

  /**
   * Cached Bottleneck limiter for REST API calls
   */
  restLimiter: null,

  /**
   * Gets or creates the appropriate rate limiter and schedules a function
   * @param {string} url - The URL to determine which limiter to use
   * @param {Function} fn - The function to schedule
   * @returns {Promise<any>} The result of the scheduled function
   */
  async schedule(url, fn) {
    // Use Search API limiter for search endpoints, REST limiter for others
    const isSearchAPI = url.includes('/search/');

    if (isSearchAPI) {
      if (!__.searchLimiter) {
        __.searchLimiter = new Bottleneck({
          minTime: SEARCH_API_MIN_TIME,
        });
      }
      return await __.searchLimiter.schedule(fn);
    } else {
      if (!__.restLimiter) {
        __.restLimiter = new Bottleneck({
          minTime: REST_API_MIN_TIME,
        });
      }
      return await __.restLimiter.schedule(fn);
    }
  },

  /**
   * Makes an API call to the specified URL with automatic retry logic and rate limiting
   * @param {string} url - The URL to make the API call to
   * @param {number} [retryCount=0] - The current retry attempt count
   * @returns {Promise<object>} A promise that resolves to the JSON response from the API
   */
  async apiCall(url, retryCount = 0) {
    const retryableErrors = ['FIROST_READ_JSON_URL_HTTP_502'];

    return await __.schedule(url, async () => {
      try {
        return await readJsonUrl(url, { headers: __.getHeaders() });
      } catch (err) {
        if (_.includes(retryableErrors, err.code)) {
          consoleWarn('Retrying failed call');
          // If we retried enough times, we fail for real
          if (retryCount >= 3) {
            throw err;
          }
          return await __.apiCall(url, retryCount + 1);
        }

        throw err;
      }
    });
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
