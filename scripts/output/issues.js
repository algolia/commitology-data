import { _, dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson, spinner, writeJson } from 'firost';
import {
  dataInputCommentsIssuesPath,
  dataInputIssuesPath,
  dataOutputIssuesPath,
  outputIssueFieldOrder,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';

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
  return {
    avatar: rawUser.avatar_url,
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
  return {
    confused: rawReactions.confused,
    eyes: rawReactions.eyes,
    heart: rawReactions.heart,
    hooray: rawReactions.hooray,
    laugh: rawReactions.laugh,
    minus: rawReactions['-1'],
    plus: rawReactions['+1'],
    rocket: rawReactions.rocket,
  };
}

/**
 * Normalizes comments for a given issue by reading raw comment data from a JSON file
 * @param {object} normalizedIssue - The normalized issue object containing date and number properties
 * @param {Date|string} normalizedIssue.date - The date associated with the issue
 * @param {number|string} normalizedIssue.number - The issue number identifier
 * @returns {Promise<void>} Promise that resolves when comments are processed and logged
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
  const { number, title, body, labels } = rawIssue;
  const user = normalizeUser(rawIssue.user);
  const date = normalizeDate(rawIssue.created_at);
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

const rawIssuePaths = await glob('./**/99.json', { cwd: dataInputIssuesPath });
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
