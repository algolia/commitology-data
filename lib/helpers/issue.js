import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';
import { normalizeBody } from './body.js';
import { normalizeDate } from './date.js';
import {
  forEachGitHubPageOfYearByType,
  forEachGitHubYearByType,
} from './github.js';
import { normalizeLabels } from './labels.js';
import { normalizeReactions } from './reactions.js';
import { normalizeSentiment } from './sentiment.js';

let __;

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
    'title',
    'date',
    'body',
    'user',
    'commentCount',
    'reactionCount',
    'sentiment',
    'issue',
  ],
};

/**
 * Iterates sequentially through each year from current to oldest issue year
 * @param {Function} callback - Function to execute for each year. Receives the year number. Return false to stop iteration.
 * @returns {Promise<void>}
 */
export async function forEachGitHubYear(callback) {
  return await forEachGitHubYearByType('issue', callback);
}

/**
 * Iterates sequentially through each page of issues for a given year
 * @param {number} year - The year to iterate through
 * @param {Function} callback - Function to execute for each page. Receives (items, page). Return false to stop iteration.
 * @param {object} [options] - Options
 * @param {number} [options.page=1] - Starting page number
 * @returns {Promise<boolean>} false if callback returned false (stop all), true otherwise
 */
export async function forEachGitHubPageOfYear(year, callback, options = {}) {
  return await forEachGitHubPageOfYearByType('issue', year, callback, options);
}

/**
 * Iterates through each JSON file in the input directory and executes a callback function for each one.
 * @param {Function} callback - Function to execute for each JSON file. Receives an object with filepath, data, index, and max properties.
 * @param {object} options - Options to pass to the pMap function for controlling concurrency and other mapping behavior.
 * @returns {Promise<Array>} Promise that resolves to an array of results returned by the callback function for each file.
 */
export async function forEachInputIssue(callback, options) {
  const filepaths = await glob('./**/*/issue.json', { cwd: inputDirectory });
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
 * @param {string} filepath - The filepath to the issue.json file
 * @returns {Promise<object>} A normalized issue object with type, number, title, user, body, date, labels, state, reactions, sentiment
 */
export async function normalizeIssue(filepath) {
  // Read issue data
  const inputIssue = await readJson(filepath);

  const { number, title } = inputIssue;
  const body = await normalizeBody(inputIssue.body);
  const commentCount = inputIssue.comments;
  const reactionCount = inputIssue.reactions.total_count;
  const date = normalizeDate(inputIssue.created_at);
  const labels = normalizeLabels(inputIssue.labels);
  const state = __.normalizeState(inputIssue);
  const reactions = normalizeReactions(inputIssue.reactions);
  const user = inputIssue.user.id;

  // Read sentiment
  const sentimentPath = _.replace(filepath, 'issue.json', 'sentiment.json');
  const sentiment = await normalizeSentiment(sentimentPath, reactions);

  const issue = {
    // Common
    type: 'issue',
    title,
    date,
    body,
    // User
    user,
    // Counts
    commentCount,
    reactionCount,
    // Sentiment
    sentiment,
    // Issue
    issue: {
      number,
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
};
