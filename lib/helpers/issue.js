import { pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';
import { normalizeDate } from './date.js';
import { normalizeLabels } from './labels.js';
import { normalizeReactions } from './reactions.js';

export let __;

export const inputDirectory = absolute(gitRoot(), 'data/input/issues');
export const outputDirectory = absolute(gitRoot(), 'data/output/issues');
export const commentsDirectory = absolute(
  gitRoot(),
  'data/input/comments/issues',
);

export const fieldOrder = {
  input: [
    'number',
    'html_url',
    'title',
    'body',
    'created_at',
    'state',
    'comments',
    'reactions',
    'labels',
    'user',
  ],
  output: ['type', 'title', 'date', 'body', 'user', 'issue'],
};

/**
 * Iterates through each JSON file in the input directory and executes a callback function for each one.
 * @param {Function} callback - Function to execute for each JSON file. Receives an object with filepath, data, index, and max properties.
 * @param {object} options - Options to pass to the pMap function for controlling concurrency and other mapping behavior.
 * @returns {Promise<Array>} Promise that resolves to an array of results returned by the callback function for each file.
 */
export async function forEachInputIssue(callback, options) {
  const filepaths = await glob('./**/*.json', { cwd: inputDirectory });
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
 * @returns {Promise<object>} A normalized issue object with type, number, title, user, body, date, labels, state, reactions
 */
export async function normalizeIssue(inputIssue) {
  const { number, title, body } = inputIssue;
  const date = normalizeDate(inputIssue.created_at);
  const labels = normalizeLabels(inputIssue.labels);
  const state = __.normalizeState(inputIssue);
  const reactions = normalizeReactions(inputIssue.reactions);
  const user = inputIssue.user.id;
  const commentCount = await __.getCommentCount(number);
  const issue = {
    // Common
    type: 'issue',
    title,
    date,
    body,
    // User
    user,
    // Issue
    issue: {
      number,
      commentCount,
      labels,
      state,
      reactions,
    },
  };

  return issue;
}

/**
 * Normalizes the file path for an issue data file
 * @param {object} issue - The issue object containing metadata
 * @param {number} issue.number - The issue number
 * @param {string|Date} issue.date - The issue date
 * @returns {string} The absolute path to the issue JSON file
 */
export function getOutputPath(issue) {
  return absolute(
    outputDirectory,
    datePath(issue.date),
    `${issue.issue.number}.json`,
  );
}

__ = {
  /**
   * Normalizes the state of an issue based on its state and state reason.
   * @param {object} inputIssue - The input issue object
   * @param {string} inputIssue.state - The current state of the issue
   * @param {string} inputIssue.state_reason - The reason for the current state
   * @returns {string} The normalized state: 'open', 'closed', or 'ignored'
   */
  normalizeState(inputIssue) {
    const { state, state_reason } = inputIssue;
    if (state == 'open') {
      return 'open';
    }
    if (state_reason == 'completed') {
      return 'closed';
    }
    return 'ignored';
  },
  /**
   * Gets the count of comments for a specific issue
   * @param {number} issueNumber - The issue number to get comment count for
   * @returns {Promise<number>} The number of comments for the issue
   */
  async getCommentCount(issueNumber) {
    const commentsPath = await glob(`./**/${issueNumber}.json`, {
      cwd: commentsDirectory,
    });
    const comments = await readJson(commentsPath[0]);
    return comments.length;
  },
};
