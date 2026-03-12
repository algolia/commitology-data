import { pMap } from 'golgoth';
import { absolute, glob, readJson } from 'firost';
import {
  dataInputCommitsPath,
  dataOutputCommitsPath,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';

/**
 * Iterates over all input commit JSON files and executes a callback function for each one.
 * @param {Function} callback - The callback function to execute for each input commit
 * @param {object} options - Options object passed to pMap for controlling concurrency
 * @returns {Promise<Array>} A promise that resolves to an array of callback results
 */
export async function forEachInputCommit(callback, options) {
  const filepaths = await glob('./**/*.json', { cwd: dataInputCommitsPath });
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
 * Normalizes a commit object to a standardized format with shortened hash and consistent property names.
 * @param {object} inputCommit - The raw commit object to normalize
 * @param {string} inputCommit.hash - The full commit hash
 * @param {string} inputCommit.subject - The commit subject/message
 * @param {string} inputCommit.author - The commit author
 * @param {string} inputCommit.body - The commit body/description
 * @param {string|Date} inputCommit.date - The commit date
 * @returns {Promise<object>} A normalized commit object with type, hash (7 chars), title, author, body, and date
 */
export function normalizeCommit(inputCommit) {
  const { author, body, date } = inputCommit;

  const hash = inputCommit.hash.substring(0, 7);
  const title = inputCommit.subject;

  return {
    type: 'commit',
    hash,
    title,
    author,
    body,
    date,
  };
}

/**
 * Generates the absolute file path for a commit's output JSON file
 * @param {object} commit - The commit object containing date and hash information
 * @param {string|Date} commit.date - The commit date
 * @param {string} commit.hash - The commit hash
 * @returns {string} The absolute path to the commit's JSON output file
 */
export function getOutputPath(commit) {
  const { date, hash } = commit;
  return absolute(dataOutputCommitsPath, datePath(date), `${hash}.json`);
}
