import { _, pMap } from 'golgoth';
import { absolute, exists, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';
import { normalizeBody } from './body.js';
import { normalizeDate } from './date.js';
import { normalizeReactions } from './reactions.js';

export const inputDirectory = absolute(gitRoot(), 'data/input/comments');
export const outputDirectory = absolute(gitRoot(), 'data/output/comments');

export const fieldOrder = ['type', 'date', 'body', 'user', 'parent', 'comment'];

let __ = {};

/**
 * Iterates through all JSON files in the input directory and executes a callback for each file
 * @param {Function} callback - Function to execute for each JSON file, receives an object with filepath, data, index, and max properties
 * @param {object} options - Options object passed to pMap for controlling concurrency and other mapping behavior
 * @returns {Promise<Array>} Promise that resolves to an array of results from the callback executions
 */
export async function forEachInputComment(callback, options) {
  const filepaths = await glob('./**/*.json', { cwd: inputDirectory });
  const max = filepaths.length;

  return await pMap(
    filepaths,
    async (filepath, index) => {
      const comments = await readJson(filepath);
      await pMap(comments, async (comment) => {
        const data = comment;
        return await callback({ filepath, data, index, max });
      });
    },
    options,
  );
}

/**
 * Normalizes a comment object by extracting and transforming its properties
 * @param {object} inputComment - The raw comment object to normalize
 * @param {string} inputComment.body - The comment body text
 * @param {string|number} inputComment.id - The comment identifier
 * @param {string} inputComment.created_at - The comment creation timestamp
 * @param {object} inputComment.reactions - The comment reactions data
 * @param {object} inputComment.user - The user who created the comment
 * @returns {Promise<object>} Normalized comment object with id, user, body, date, and reactions properties
 */
export async function normalizeComment(inputComment) {
  const { id } = inputComment;
  const body = await normalizeBody(inputComment.body);
  const date = normalizeDate(inputComment.created_at);
  const reactions = normalizeReactions(inputComment.reactions);
  const user = inputComment.user.id;
  const parent = __.getParentEntity(inputComment);
  const githubAppId = __.getGitHubAppId(inputComment);
  return {
    // Common
    type: 'comment',
    date,
    body,
    // User
    user,
    // Comment
    comment: {
      id,
      githubAppId,
      reactions,
    },
    // Parent entity
    parent,
  };
}

/**
 * Generates the absolute output file path for a comment JSON file.
 * @param {object} comment - The comment object containing date and ID information
 * @param {Function} comment.datePath - Method that converts a date to a path string
 * @param {Date} comment.date - The date associated with the comment
 * @param {object} comment.comment - The comment data object
 * @param {string} comment.comment.id - The unique identifier for the comment
 * @returns {string} The absolute file path where the comment JSON should be saved
 */
export function getOutputPath(comment) {
  return absolute(
    outputDirectory,
    datePath(comment.date),
    `${comment.comment.id}.json`,
  );
}

/**
 * Normalizes and returns the comment count for a given item by reading from the corresponding JSON file
 * @param {object} item - The item object containing type, date, and type-specific data
 * @param {string} item.type - The type of the item (e.g., 'issue', 'pull')
 * @param {string} item.date - The date associated with the item
 * @returns {Promise<number>} The number of comments for the item, or 0 if no comments file exists
 */
export async function normalizeCommentCount(item) {
  const { type, date } = item;
  const number = item[type].number;

  const commentPath = absolute(
    inputDirectory,
    `${type}s`,
    datePath(date),
    `${number}.json`,
  );

  if (!(await exists(commentPath))) {
    return 0;
  }

  const comments = await readJson(commentPath);
  return comments.length;
}

__ = {
  /**
   * Extracts parent issue or pull request information from a comment's HTML URL
   * @param {object} rawComment - The raw comment object containing HTML URL
   * @param {string} rawComment.html_url - The HTML URL of the comment
   * @returns {object} Object containing the parent type and number
   */
  getParentEntity(rawComment) {
    const matches = rawComment.html_url.match(/\/(issues|pull)\/(\d+)/);
    const type = matches[1] === 'issues' ? 'issue' : 'pull';
    const number = _.toNumber(matches[2]);
    return {
      type,
      number,
    };
  },
  getGitHubAppId(rawComment) {
    return _.get(rawComment, 'performed_via_github_app.id', null);
  },
};
