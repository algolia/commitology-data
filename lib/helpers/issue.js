import { _, pMap } from 'golgoth';
import { absolute, glob, readJson } from 'firost';
import {
  dataInputCommentsIssuesPath,
  dataInputIssuesPath,
  dataOutputIssuesPath,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';
import { normalizeComment } from './comment.js';
import { normalizeDate } from './date.js';
import { normalizeLabels } from './labels.js';
import { normalizeReactions } from './reactions.js';
import { normalizeUser } from './user.js';

export let __;

/**
 * Iterates over all JSON files in the input issues directory and executes a callback for each file.
 * @param {Function} callback - Function to execute for each input issue file, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and other behaviors
 * @returns {Promise<Array>} Promise that resolves to an array of results returned by the callback function
 */
export async function forEachInputIssue(callback, options) {
  const filepaths = await glob('./**/*.json', { cwd: dataInputIssuesPath });
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
 * Normalizes an issue object by extracting and formatting key properties
 * @param {object} inputIssue - The raw issue object to normalize
 * @returns {Promise<object>} A normalized issue object with type, number, title, user, body, date, labels, state, reactions, and comments
 */
export async function normalizeIssue(inputIssue) {
  const { number, title, body } = inputIssue;
  const user = normalizeUser(inputIssue.user);
  const date = normalizeDate(inputIssue.created_at);
  const labels = normalizeLabels(inputIssue.labels);
  const state = __.normalizeState(inputIssue);
  const reactions = normalizeReactions(inputIssue.reactions);
  const issue = {
    number,
    title,
    user,
    body,
    date,
    labels,
    state,
    reactions,
  };

  const comments = await __.normalizeComments(issue);
  return {
    type: 'issue',
    ...issue,
    comments,
  };
}

/**
 * Normalizes the file path for an issue data file
 * @param {object} issue - The issue object containing metadata
 * @param {number} issue.number - The issue number
 * @param {string|Date} issue.date - The issue date
 * @returns {string} The absolute path to the issue JSON file
 */
export function getOutputPath(issue) {
  const { number, date } = issue;
  return absolute(dataOutputIssuesPath, datePath(date), `${number}.json`);
}

__ = {
  /**
   * Normalizes the state information from a raw issue object
   * @param {object} rawIssue - The raw issue object containing state information
   * @returns {object} Normalized state object with value and reason properties
   */
  normalizeState(rawIssue) {
    return {
      value: rawIssue.state,
      reason: rawIssue.state_reason,
    };
  },
  /**
   * Normalizes comments for a given issue by reading raw comments from file and applying normalization.
   * @param {object} issue - The issue object containing issue data
   * @returns {Promise<Array>} A promise that resolves to an array of normalized comment objects
   */
  async normalizeComments(issue) {
    const issuePath = getOutputPath(issue);
    const commentsPath = _.replace(
      issuePath,
      dataOutputIssuesPath,
      dataInputCommentsIssuesPath,
    );
    const rawComments = await readJson(commentsPath);

    return _.map(rawComments, normalizeComment);
  },
};
