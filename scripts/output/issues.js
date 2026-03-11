import { _, dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson, spinner, writeJson } from 'firost';
import {
  dataInputCommentsIssuesPath,
  dataInputIssuesPath,
  dataOutputIssuesPath,
  outputIssueFieldOrder,
} from '../../lib/config.js';
import { datePath, isDarkColor } from '../../lib/helper.js';

/**
 * Normalizes a raw user object by mapping properties to a standardized format.
 * @param {object} rawUser - The raw user object to normalize
 * @param {string} rawUser.avatar_url - The user's avatar URL
 * @param {number|string} rawUser.id - The user's unique identifier
 * @param {string} rawUser.login - The user's login name
 * @param {string} rawUser.type - The user's account type
 * @returns {object} The normalized user object with avatar, id, login, and type properties
 */
function normalizeUser(rawUser) {
  const { avatar_url } = rawUser;
  const avatar = _.split(avatar_url, '?')[0];
  return {
    avatar,
    id: rawUser.id,
    login: rawUser.login,
    type: rawUser.type,
  };
}

/**
 * Normalizes a date input to a Unix timestamp
 * @param {string|Date|number} rawDate - The raw date input to normalize
 * @returns {number} The Unix timestamp representation of the date
 */
function normalizeDate(rawDate) {
  return dayjs(rawDate).unix();
}

/**
 * Normalizes an array of raw label objects by extracting only the id, name, and color properties.
 * @param {Array<object>} rawLabels - Array of raw label objects to normalize
 * @returns {Array<object>} Array of normalized label objects containing only id, name, and color properties
 */
function normalizeLabels(rawLabels) {
  return _.map(rawLabels, (rawLabel) => {
    const { color, id, name } = rawLabel;
    const isDark = isDarkColor(color);
    return { id, name, color, isDark };
  });
}

/**
 * Normalizes the state information from a raw issue object
 * @param {object} rawIssue - The raw issue object containing state information
 * @returns {object} Normalized state object with value and reason properties
 */
function normalizeState(rawIssue) {
  return {
    value: rawIssue.state,
    reason: rawIssue.state_reason,
  };
}

/**
 * Normalizes raw reaction data by mapping reaction types to a standardized format
 * @param {object} rawReactions - Raw reaction data object containing reaction counts
 * @returns {object} Normalized reaction object with standardized property names
 */
function normalizeReactions(rawReactions) {
  const allowedReactions = {
    confused: '😕',
    eyes: '👀',
    heart: '❤️',
    hooray: '🎉',
    laugh: '😄',
    '-1': '👎️',
    '+1': '👍️',
    rocket: '🚀',
  };
  const reactions = {};
  _.each(allowedReactions, (reactionEmoji, reactionName) => {
    const reactionCount = rawReactions[reactionName];
    if (!reactionCount) {
      return;
    }
    reactions[reactionEmoji] = reactionCount;
  });
  return reactions;
}

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
    const date = normalizeDate(rawComment.created_at);
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

/**
 * Normalizes a raw issue object by extracting and transforming relevant properties
 * @param {object} rawIssue - The raw issue object from the API
 * @returns {Promise<object>} A normalized issue object with structured data including comments
 */
async function normalizeIssue(rawIssue) {
  const { number, title, body } = rawIssue;
  const user = normalizeUser(rawIssue.user);
  const date = normalizeDate(rawIssue.created_at);
  const labels = normalizeLabels(rawIssue.labels);
  const state = normalizeState(rawIssue);
  const reactions = normalizeReactions(rawIssue.reactions);
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
function normalizePath(issue) {
  const { number, date } = issue;
  return absolute(dataOutputIssuesPath, datePath(date), `${number}.json`);
}

const rawIssuePaths = await glob('./**/*.json', { cwd: dataInputIssuesPath });
const progress = spinner(rawIssuePaths.length);
await pMap(
  rawIssuePaths,
  async (rawIssuePath) => {
    const rawIssueData = await readJson(rawIssuePath);
    const issueData = await normalizeIssue(rawIssueData);
    const issuePath = normalizePath(issueData);

    progress.tick(issueData.title);

    await writeJson(issueData, issuePath, {
      sort: outputIssueFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All issues generated');
