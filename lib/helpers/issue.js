import { _, dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson } from 'firost';
import {
  dataInputCommentsIssuesPath,
  dataInputIssuesPath,
  dataOutputIssuesPath,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';
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
  const date = __.normalizeDate(inputIssue.created_at);
  const labels = __.normalizeLabels(inputIssue.labels);
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

  const comments = await normalizeComments(issue);
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
   * Normalizes a date input to a Unix timestamp
   * @param {string|Date|number} rawDate - The raw date input to normalize
   * @returns {number} The Unix timestamp representation of the date
   */
  normalizeDate(rawDate) {
    return dayjs(rawDate).unix();
  },

  /**
   * Determines if a hex color is considered dark based on its luminance value.
   * @param {string} hexColor - The hex color code (with or without # prefix)
   * @returns {boolean} True if the color is dark (luminance <= 0.5), false otherwise
   */
  isDarkColor(hexColor) {
    const hex = hexColor.replace('#', '');

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance <= 0.5;
  },

  /**
   * Normalizes an array of raw label objects by extracting only the id, name, and color properties.
   * @param {Array<object>} rawLabels - Array of raw label objects to normalize
   * @returns {Array<object>} Array of normalized label objects containing only id, name, and color properties
   */
  normalizeLabels(rawLabels) {
    return _.map(rawLabels, (rawLabel) => {
      const { color, id, name } = rawLabel;
      const isDark = __.isDarkColor(color);
      return { id, name, color, isDark };
    });
  },

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
};

/**
 * Normalizes comments for a given issue by reading raw comment data and transforming it into a standardized format
 * @param {object} normalizedIssue - The normalized issue object containing date and number properties
 * @param {string} normalizedIssue.date - The date of the issue
 * @param {number} normalizedIssue.number - The issue number
 * @returns {Promise<Array<object>>} Array of normalized comment objects with id, user, body, date, and reactions properties
 */
async function normalizeComments(normalizedIssue) {
  const commentsPath = absolute(
    dataInputCommentsIssuesPath,
    datePath(normalizedIssue.date),
    `${normalizedIssue.number}.json`,
  );
  const rawComments = await readJson(commentsPath);

  return _.map(rawComments, (rawComment) => {
    const { body, id } = rawComment;
    const date = __.normalizeDate(rawComment.created_at);
    const reactions = normalizeReactions(rawComment.reactions);
    const user = normalizeUser(rawComment.user);
    return {
      id,
      user,
      body,
      date,
      reactions,
    };
  });
}
