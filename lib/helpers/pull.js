import { _, pMap } from 'golgoth';
import { absolute, glob, readJson } from 'firost';
import {
  dataInputCommentsPullsPath,
  dataInputPullsPath,
  dataOutputPullsPath,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';
import { normalizeComment } from './comment.js';
import { normalizeDate } from './date.js';
import { normalizeLabels } from './labels.js';
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
  const date = normalizeDate(inputPull.created_at);
  const labels = normalizeLabels(inputPull.labels);
  const state = __.normalizeState(inputPull);
  const reactions = normalizeReactions(inputPull.reactions);
  const pull = {
    // Common
    type: 'pull',
    distinctKey: `pull:${number}`,
    title,
    date,
    body,
    // User
    user,
    // Pull
    pull: {
      number,
      labels,
      state,
      reactions,
    },
  };

  const comments = await __.normalizeComments(pull);
  return {
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
   * Normalizes the state information from an input pull request object.
   * @param {object} inputPull - The input pull request object containing state information
   * @returns {object} An object with normalized value and reason properties
   */
  normalizeState(inputPull) {
    const { draft, state, pull_request } = inputPull;
    if (draft) {
      return 'draft';
    }
    if (state == 'open') {
      return 'open';
    }
    if (pull_request.merged_at) {
      return 'merged';
    }
    return 'closed';
  },
  /**
   * Normalizes pull request comments by reading raw comment data from a JSON file and transforming it into a standardized format.
   * @param {object} pull - The pull request object containing metadata
   * @param {string} pull.date - The date associated with the pull request
   * @param {number} pull.number - The pull request number
   * @returns {Promise<Array<object>>} A promise that resolves to an array of normalized comment objects with id, user, body, date, and reactions properties
   */
  async normalizeComments(pull) {
    const issuePath = getOutputPath(pull);
    const commentsPath = _.replace(
      issuePath,
      dataOutputPullsPath,
      dataInputCommentsPullsPath,
    );
    const rawComments = await readJson(commentsPath);

    return _.map(rawComments, normalizeComment);
  },
};
