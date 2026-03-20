import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';
import { normalizeBody } from './body.js';
import { normalizeDate } from './date.js';
import { normalizeLabels } from './labels.js';
import { normalizeReactions } from './reactions.js';

export let __;

export const inputDirectory = absolute(gitRoot(), 'data/input/pulls');
export const outputDirectory = absolute(gitRoot(), 'data/output/pulls');
export const commentsDirectory = absolute(
  gitRoot(),
  'data/input/comments/pulls',
);

export const fieldOrder = {
  input: [],
  output: [
    'type',
    'title',
    'date',
    'body',
    'user',
    'commentCount',
    'reactionCount',
    'pull',
    'comments',
  ],
};

/**
 * Processes pull request folders from the data input pulls directory by applying a callback function to each.
 * Each pull request folder contains basic.json and detailed.json files that are merged before being passed to the callback.
 * @param {Function} callback - Function to execute for each pull request, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and other settings
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback function
 */
export async function forEachInputPull(callback, options) {
  const basicPaths = await glob('./**/basic.json', { cwd: inputDirectory });
  const max = basicPaths.length;

  return await pMap(
    basicPaths,
    async (basicPath, index) => {
      const detailedPath = _.replace(basicPath, 'basic.json', 'detailed.json');

      const basicData = await readJson(basicPath);
      const detailedData = await readJson(detailedPath);

      const data = {
        ...basicData,
        ...detailedData,
      };

      return await callback({ data, index, max });
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
  const { number, title } = inputPull;
  const body = await normalizeBody(inputPull.body);
  const commentCount = inputPull.comments;
  const reactionCount = inputPull.reactions.total_count;
  const changedFilesCount = inputPull.changed_files;
  const addedLinesCount = inputPull.additions;
  const deletedLinesCount = inputPull.deletions;
  const date = normalizeDate(inputPull.created_at);
  const labels = normalizeLabels(inputPull.labels);
  const state = __.normalizeState(inputPull);
  const reactions = normalizeReactions(inputPull.reactions);
  const user = inputPull.user.id;

  const pull = {
    // Common
    type: 'pull',
    title,
    date,
    body,
    // User
    user,
    // Counts
    commentCount,
    reactionCount,
    // Pull
    pull: {
      number,
      labels,
      state,
      reactions,
      changedFilesCount,
      addedLinesCount,
      deletedLinesCount,
    },
  };

  return pull;
}

/**
 * Generates the absolute file path for a pull request output JSON file.
 * @param {object} pull - The pull request object
 * @param {number} pull.number - The pull request number
 * @param {string|Date} pull.date - The date associated with the pull request
 * @returns {string} The absolute path to the pull request JSON output file
 */
export function getOutputPath(pull) {
  return absolute(
    outputDirectory,
    datePath(pull.date),
    `${pull.pull.number}.json`,
  );
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
};
