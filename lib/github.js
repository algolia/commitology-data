import { env, firostError, readJsonUrl, sleep } from 'firost';
import { repoSlug } from './config.js';

export let __;

/**
 * Retrieves the total count of issues for a GitHub repository.
 * @returns {Promise<number>} The total number of issues in the repository
 */
export async function getIssueCount() {
  const endpointUrl = `https://api.github.com/search/issues?q=repo:${repoSlug}+is:issue&per_page=1`;
  const result = await readJsonUrl(endpointUrl, { headers: __.getHeaders() });
  return result.total_count;
}

/**
 * Retrieves GitHub issues from a repository with pagination and retry logic
 * @param {object} [userOptions={}] - User configuration options for pagination
 * @param {number} [userOptions.page=1] - The page number to retrieve
 * @param {number} [userOptions.perPage=50] - The number of items per page
 * @param {object} [metadata={}] - Internal metadata for retry handling
 * @param {number} [metadata.retryCount=0] - Current retry attempt count
 * @returns {Promise<Array>} Array of issue objects from the GitHub API
 */
export async function getIssues(userOptions = {}, metadata = {}) {
  const { page, perPage } = {
    page: 1,
    perPage: 50,
    ...userOptions,
  };
  const { retryCount } = {
    retryCount: 0,
    ...metadata,
  };
  const url = `https://api.github.com/search/issues?q=repo:${repoSlug}+is:issue&per_page=${perPage}&page=${page}`;

  try {
    const results = await readJsonUrl(url, { headers: __.getHeaders() });
    return results.items;
  } catch (error) {
    // If a non-403 error, we stop everything
    if (error.code != 'FIROST_READ_JSON_URL_HTTP_403') {
      throw error;
    }

    // If we retried enough times, we stop
    if (retryCount >= 3) {
      throw firostError(
        'COMMITOLOGY_GITHUB_403_MAX_RETRIES',
        `Unable to fetch ${url} even after ${retryCount} tries`,
      );
    }

    // We wait a little bit and try again
    console.log(`[#${retryCount}] ${url} is 403. Wait 15s and try again`);
    await sleep(15000);
    return await getIssues(userOptions, { retryCount: retryCount + 1 });
  }
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
