import { _, pMap } from 'golgoth';
import { glob, readJson } from 'firost';
import { inputPath as authorInputPath } from './author.js';
import { outputDirectory as commitOutputDirectory } from './commit.js';
import { outputDirectory as issueOutputDirectory } from './issue.js';
import { outputDirectory as pullOutputDirectory } from './pull.js';
import { outputDirectory as userOutputDirectory } from './user.js';

let __ = {};

/**
 * Retrieves and processes GitHub issues and pull requests records from JSON files
 * @returns {Promise<Array<object>>} Array of records containing issues, pull requests, and their comments with processed user data
 */
export async function getIssuesAndPullsRecords() {
  await __.initUserCache();

  const issuesPaths = await glob('./**/*.json', { cwd: issueOutputDirectory });
  const pullsPaths = await glob('./**/*.json', { cwd: pullOutputDirectory });
  const issuesAndPulls = await pMap([...issuesPaths, ...pullsPaths], readJson);

  const records = [];
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

/**
 *
 */
export async function getCommitsRecords() {
  await __.initAuthorCache();
  await __.initUserCache();

  const commitsPath = await glob('./**/*.json', { cwd: commitOutputDirectory });
  const commits = await pMap(commitsPath, readJson);

  return await pMap(commits, async (commit) => {
    const user = __.getAuthorRecord(commit.author);
    delete commit.author;
    return {
      ...commit,
      user,
    };
  });
}

__ = {
  userCache: null,

  /**
   * Initializes the user cache by loading all JSON files from the issue output directory
   * @returns {Promise<void>} A promise that resolves when the cache is fully initialized
   */
  async initUserCache() {
    if (__.userCache) {
      return;
    }
    __.userCache = {};

    const userFilepaths = await glob('./**/*.json', {
      cwd: userOutputDirectory,
    });
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

  authorCache: null,

  /**
   * Initializes the author cache by reading author data from a JSON file and populating the cache object
   * @returns {Promise<void>} A promise that resolves when the author cache has been initialized
   */
  async initAuthorCache() {
    if (__.authorCache) {
      return;
    }
    __.authorCache = await readJson(authorInputPath);
  },

  /**
   * Retrieves the user record for a given author from the author cache
   * @param {string} authorName - The name of the author to look up
   * @returns {object} The user record associated with the author
   * @throws {Error} Throws firostError when author ID is -1
   */
  getAuthorRecord(authorName) {
    const author = __.authorCache[authorName];
    return __.getUserRecord(author.id);
  },
};
