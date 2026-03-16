import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';
import { normalizeComment } from './comment.js';
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
  output: [
    'type',
    'distinctKey',
    'title',
    'date',
    'body',
    'user',
    'issue',
    'comments',
  ],
};

/**
 * Gets the absolute output file path for a user's JSON data file.
 * @param {object} user - The user object containing identification information
 * @param {string|number} user.id - The unique identifier for the user
 * @param callback
 * @param options
 * @returns {string} The absolute file path to the user's JSON output file
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
 * @returns {Promise<object>} A normalized issue object with type, number, title, user, body, date, labels, state, reactions, and comments
 */
export async function normalizeIssue(inputIssue) {
  const { number, title, body } = inputIssue;
  const date = normalizeDate(inputIssue.created_at);
  const labels = normalizeLabels(inputIssue.labels);
  const state = __.normalizeState(inputIssue);
  const reactions = normalizeReactions(inputIssue.reactions);
  const user = inputIssue.user.id;
  const issue = {
    // Common
    type: 'issue',
    distinctKey: `issue:${number}`,
    title,
    date,
    body,
    // User
    user,
    // Issue
    issue: {
      number,
      labels,
      state,
      reactions,
    },
  };

  const comments = await __.normalizeComments(issue);
  return {
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
   * Normalizes comments for a given issue by reading raw comments from file and applying normalization.
   * @param {object} issue - The issue object containing issue data
   * @returns {Promise<Array>} A promise that resolves to an array of normalized comment objects
   */
  async normalizeComments(issue) {
    const issuePath = getOutputPath(issue);
    const commentsPath = _.replace(
      issuePath,
      outputDirectory,
      commentsDirectory,
    );
    const rawComments = await readJson(commentsPath);

    return _.map(rawComments, normalizeComment);
  },
};
