import { _, dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson } from 'firost';
import {
  dataInputCommentsPullsPath,
  dataInputPullsPath,
  dataOutputPullsPath,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';
import { normalizeReactions } from './reactions.js';
import { normalizeUser } from './user.js';

export let __;

/**
 * Processes JSON files from the data input pulls directory by applying a callback function to each file.
 * @param {Function} callback - Function to execute for each JSON file, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and other settings
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback function
 */
export async function forEachInputPull(callback, options) {
  const filepaths = await glob('./**/*.json', { cwd: dataInputPullsPath });
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
 * Normalizes a pull request object by extracting and transforming relevant fields
 * @param {object} inputPull - The raw pull request object to normalize
 * @returns {Promise<object>} A normalized pull request object with type, number, title, user, body, date, labels, state, reactions, and comments
 */
export async function normalizePull(inputPull) {
  const { number, title, body } = inputPull;
  const user = normalizeUser(inputPull.user);
  const date = __.normalizeDate(inputPull.created_at);
  const labels = __.normalizeLabels(inputPull.labels);
  const state = __.normalizeState(inputPull);
  const reactions = normalizeReactions(inputPull.reactions);
  const pull = {
    number,
    title,
    user,
    body,
    date,
    labels,
    state,
    reactions,
  };

  const comments = await normalizeComments(pull);
  return {
    type: 'pull',
    ...pull,
    comments,
  };
}

/**
 * Generates the absolute file path for a pull request output JSON file.
 * @param {object} pull - The pull request object
 * @param {number} pull.number - The pull request number
 * @param {string|Date} pull.date - The date associated with the pull request
 * @returns {string} The absolute path to the pull request JSON output file
 */
export function getOutputPath(pull) {
  const { number, date } = pull;
  return absolute(dataOutputPullsPath, datePath(date), `${number}.json`);
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
   * Normalizes the state information from an input pull request object.
   * @param {object} inputPull - The input pull request object containing state information
   * @returns {object} An object with normalized value and reason properties
   */
  normalizeState(inputPull) {
    return {
      value: inputPull.state,
      reason: inputPull.state_reason,
    };
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
};

/**
 * Normalizes pull request comments by reading raw comment data from a JSON file and transforming it into a standardized format.
 * @param {object} pull - The pull request object containing metadata
 * @param {string} pull.date - The date associated with the pull request
 * @param {number} pull.number - The pull request number
 * @returns {Promise<Array<object>>} A promise that resolves to an array of normalized comment objects with id, user, body, date, and reactions properties
 */
async function normalizeComments(pull) {
  const commentsPath = absolute(
    dataInputCommentsPullsPath,
    datePath(pull.date),
    `${pull.number}.json`,
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
