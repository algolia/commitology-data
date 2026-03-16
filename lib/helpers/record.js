import { _, pMap } from 'golgoth';
import { glob, readJson } from 'firost';
import {
  outputDirectory as issueOutputDirectory,
  outputDirectory as pullOutputDirectory,
} from './issue.js';
import { outputDirectory as userOutputDirectory } from './user.js';

let __ = {};

/**
 * Retrieves and processes GitHub issues and pull requests records from JSON files
 * @returns {Promise<Array<object>>} Array of records containing issues, pull requests, and their comments with processed user data
 */
export async function getIssuesAndPullsRecords() {
  const issuesPaths = await glob('./**/*.json', { cwd: issueOutputDirectory });
  const pullsPaths = await glob('./**/*.json', { cwd: pullOutputDirectory });
  const issuesAndPulls = await pMap([...issuesPaths, ...pullsPaths], readJson);

  const records = [];
  await __.initUserCache();
  await pMap(issuesAndPulls, async (item) => {
    // Add a top level record, without comments
    const topLevelRecord = _.clone(item);
    topLevelRecord.user = __.getUserRecord(topLevelRecord.user);
    delete topLevelRecord.comments;
    records.push(topLevelRecord);

    // Add one record per comment
    _.each(item.comments, (comment) => {
      comment.user = __.getUserRecord(comment.user);
      records.push({
        ...topLevelRecord,
        comment,
      });
    });
  });

  return records;
}

__ = {
  userCache: null,

  /**
   * Initializes the user cache by loading all JSON files from the issue output directory
   * @returns {Promise<void>} A promise that resolves when the cache is fully initialized
   */
  async initUserCache() {
    const userFilepaths = await glob('./**/*.json', {
      cwd: userOutputDirectory,
    });
    __.userCache = {};
    await pMap(userFilepaths, async (filepath) => {
      const user = await readJson(filepath);
      __.userCache[user.id] = user;
    });
  },

  /**
   * Retrieves a user record by ID, initializing the user cache if necessary
   * @param {string} recordId - The unique identifier of the user record to retrieve
   * @returns {Promise<object | undefined>} The user record object if found, undefined otherwise
   */
  getUserRecord(recordId) {
    return __.userCache[recordId];
  },
};
